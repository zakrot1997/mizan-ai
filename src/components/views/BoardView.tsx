"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { SortableContext, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { motion } from "framer-motion";
import { Calendar, GripVertical, Plus, SquareKanban, Trash2 } from "lucide-react";
import { api, invalidate, useApi } from "@/lib/api";
import type { Task, Project } from "@/db/schema";
import { Badge, Btn, EmptyState, Field, IconBtn, Modal, Spinner } from "@/components/ui";
import {
  cn,
  fmtDate,
  PRIORITY_COLOR,
  PRIORITY_LABEL,
  TASK_STATUSES,
  TASK_STATUS_COLOR,
  TASK_STATUS_LABEL,
} from "@/lib/utils";
import { toast } from "@/lib/bus";

type TaskForm = {
  id?: string;
  title: string;
  notes: string;
  status: string;
  priority: string;
  projectId: string;
  due: string;
};
const emptyForm: TaskForm = { title: "", notes: "", status: "todo", priority: "med", projectId: "", due: "" };

function TaskCard({ task, projectName, onEdit, dragOverlay }: { task: Task; projectName?: string; onEdit?: () => void; dragOverlay?: boolean }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: task.id,
    disabled: dragOverlay,
  });
  const overdue = task.due && new Date(task.due) < new Date() && task.status !== "done";
  return (
    <div
      ref={dragOverlay ? undefined : setNodeRef}
      style={dragOverlay ? undefined : { transform: CSS.Transform.toString(transform), transition }}
      {...(dragOverlay ? {} : attributes)}
      className={cn(
        "group relative rounded-xl border border-white/8 bg-[#11182766] p-3 backdrop-blur-md transition-shadow",
        isDragging ? "opacity-30" : "hover:border-white/15 hover:shadow-[0_8px_30px_-12px_rgba(34,211,238,.25)]",
        dragOverlay && "rotate-2 shadow-2xl border-cyan-400/40"
      )}
    >
      <div className="flex items-start gap-2">
        <button {...(dragOverlay ? {} : listeners)} className="mt-0.5 cursor-grab text-slate-600 opacity-0 transition-opacity group-hover:opacity-100 active:cursor-grabbing">
          <GripVertical size={14} />
        </button>
        <button className="flex-1 text-start" onClick={onEdit}>
          <p className={cn("text-[13px] font-bold leading-snug text-slate-100", task.status === "done" && "line-through opacity-60")}>
            {task.title}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            <Badge color={PRIORITY_COLOR[task.priority]}>{PRIORITY_LABEL[task.priority]}</Badge>
            {projectName && <Badge color="#38bdf8">{projectName}</Badge>}
            {task.due && (
              <Badge color={overdue ? "#f87171" : "#64748b"}>
                <Calendar size={10} /> {fmtDate(task.due)}
              </Badge>
            )}
          </div>
        </button>
      </div>
    </div>
  );
}

function Column({ status, children, count }: { status: string; children: React.ReactNode; count: number }) {
  const { setNodeRef, isOver } = useDroppable({ id: `col-${status}` });
  const color = TASK_STATUS_COLOR[status];
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex max-h-full w-64 shrink-0 flex-col rounded-2xl border p-2 transition-colors",
        isOver ? "border-cyan-400/40 bg-cyan-400/6" : "border-white/8 bg-white/[.03]"
      )}
    >
      <div className="mb-2 flex items-center gap-2 px-2 pt-1.5">
        <span className="h-2 w-2 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}` }} />
        <span className="text-xs font-extrabold text-slate-200">{TASK_STATUS_LABEL[status]}</span>
        <span className="ms-auto rounded-full bg-white/8 px-2 py-0.5 text-[10px] font-bold text-slate-400">{count}</span>
      </div>
      <div className="board-scroll flex-1 space-y-2 overflow-y-auto px-0.5 pb-2">{children}</div>
    </div>
  );
}

export default function BoardView() {
  const { data: tasks, isLoading } = useApi<Task[]>("/api/tasks");
  const { data: projects } = useApi<Project[]>("/api/projects");
  const [activeId, setActiveId] = useState<string | null>(null);
  const [form, setForm] = useState<TaskForm | null>(null);
  const [quickAdd, setQuickAdd] = useState<Record<string, string>>({});
  const [projectFilter, setProjectFilter] = useState<string>("all");
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const projName = useMemo(() => {
    const m = new Map<string, string>();
    (projects ?? []).forEach((p) => m.set(p.id, p.name));
    return m;
  }, [projects]);

  const filtered = useMemo(
    () => (tasks ?? []).filter((t) => projectFilter === "all" || t.projectId === projectFilter),
    [tasks, projectFilter]
  );

  const byStatus = (s: string) => filtered.filter((t) => t.status === s);

  const onDragStart = (e: DragStartEvent) => setActiveId(String(e.active.id));

  const onDragEnd = async (e: DragEndEvent) => {
    setActiveId(null);
    const id = String(e.active.id);
    const over = e.over?.id ? String(e.over.id) : null;
    if (!over) return;
    let target: string | null = null;
    if (over.startsWith("col-")) target = over.slice(4);
    else {
      const t = (tasks ?? []).find((x) => x.id === over);
      if (t) target = t.status;
    }
    const task = (tasks ?? []).find((x) => x.id === id);
    if (!target || !task || task.status === target) return;
    invalidateTasksOptimistic();
    try {
      await api.patch("/api/tasks", { id, status: target });
      invalidate(["/api/tasks", "/api/overview"]);
    } catch {
      toast("فشل نقل المهمة", "err");
      invalidate(["/api/tasks"]);
    }
  };

  const invalidateTasksOptimistic = () => invalidate(["/api/tasks"]);

  const save = async () => {
    if (!form) return;
    const body = {
      title: form.title,
      notes: form.notes || null,
      status: form.status,
      priority: form.priority,
      projectId: form.projectId || null,
      due: form.due || null,
    };
    try {
      if (form.id) await api.patch("/api/tasks", { ...body, id: form.id });
      else await api.post("/api/tasks", body);
      invalidate(["/api/tasks", "/api/overview"]);
      setForm(null);
      toast("تم الحفظ", "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل", "err");
    }
  };

  const quickCreate = async (status: string) => {
    const title = (quickAdd[status] ?? "").trim();
    if (!title) return;
    setQuickAdd((s) => ({ ...s, [status]: "" }));
    await api.post("/api/tasks", {
      title,
      status,
      projectId: projectFilter !== "all" ? projectFilter : null,
    });
    invalidate(["/api/tasks", "/api/overview"]);
  };

  const activeTask = (tasks ?? []).find((t) => t.id === activeId) ?? null;

  if (isLoading) return <Spinner />;

  return (
    <div className="flex h-full flex-col p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-black text-white">لوحة المهام</h1>
        <select
          className="inp !w-auto !py-1.5 text-xs"
          value={projectFilter}
          onChange={(e) => setProjectFilter(e.target.value)}
        >
          <option value="all">كل المشاريع</option>
          {(projects ?? []).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <Btn className="ms-auto" onClick={() => setForm({ ...emptyForm, projectId: projectFilter !== "all" ? projectFilter : "" })}>
          <Plus size={15} /> مهمة جديدة
        </Btn>
      </div>

      <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
        <div dir="rtl" className="flex min-h-0 flex-1 gap-3 overflow-x-auto pb-2">
          {TASK_STATUSES.map((status) => {
            const colTasks = byStatus(status);
            return (
              <Column key={status} status={status} count={colTasks.length}>
                <SortableContext items={colTasks.map((t) => t.id)} strategy={verticalListSortingStrategy}>
                  {colTasks.map((t) => (
                    <TaskCard
                      key={t.id}
                      task={t}
                      projectName={t.projectId ? projName.get(t.projectId) : undefined}
                      onEdit={() =>
                        setForm({
                          id: t.id,
                          title: t.title,
                          notes: t.notes ?? "",
                          status: t.status,
                          priority: t.priority,
                          projectId: t.projectId ?? "",
                          due: t.due ? new Date(t.due).toISOString().slice(0, 10) : "",
                        })
                      }
                    />
                  ))}
                </SortableContext>
                <div className="mt-1 flex items-center gap-1 rounded-xl border border-dashed border-white/10 bg-transparent px-2 py-1.5 focus-within:border-cyan-400/40">
                  <Plus size={13} className="shrink-0 text-slate-600" />
                  <input
                    value={quickAdd[status] ?? ""}
                    onChange={(e) => setQuickAdd((s) => ({ ...s, [status]: e.target.value }))}
                    onKeyDown={(e) => e.key === "Enter" && quickCreate(status)}
                    placeholder="إضافة سريعة…"
                    className="w-full bg-transparent text-xs text-slate-200 outline-none placeholder:text-slate-600"
                  />
                </div>
              </Column>
            );
          })}
        </div>
        <DragOverlay>
          {activeTask ? <TaskCard task={activeTask} projectName={activeTask.projectId ? projName.get(activeTask.projectId) : undefined} dragOverlay /> : null}
        </DragOverlay>
      </DndContext>

      {(tasks ?? []).length === 0 && (
        <div className="pointer-events-none absolute inset-0 mt-24">
          <EmptyState
            icon={<SquareKanban size={26} />}
            title="لا مهام بعد"
            hint="اكتب مهمة في أي عمود بالأسفل، أو اطلب من الوكيل: «أضف 3 مهام لمشروع X»"
          />
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "تعديل مهمة" : "مهمة جديدة"}>
        {form && (
          <div className="space-y-4">
            <Field label="عنوان المهمة">
              <input className="inp" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="الحالة">
                <select className="inp" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {Object.entries(TASK_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="الأولوية">
                <select className="inp" value={form.priority} onChange={(e) => setForm({ ...form, priority: e.target.value })}>
                  {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="المشروع">
                <select className="inp" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                  <option value="">— بلا مشروع —</option>
                  {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="الاستحقاق">
                <input className="inp" type="date" value={form.due} onChange={(e) => setForm({ ...form, due: e.target.value })} />
              </Field>
            </div>
            <Field label="ملاحظات">
              <textarea className="inp min-h-20" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <div className="flex items-center justify-between pt-1">
              {form.id ? (
                <button
                  onClick={async () => {
                    await api.del("/api/tasks", { id: form.id });
                    invalidate(["/api/tasks", "/api/overview"]);
                    setForm(null);
                    toast("حُذفت المهمة", "ok");
                  }}
                  className="flex items-center gap-1.5 text-xs font-bold text-rose-400 hover:text-rose-300"
                >
                  <Trash2 size={13} /> حذف المهمة
                </button>
              ) : <span />}
              <div className="flex gap-2">
                <Btn variant="ghost" onClick={() => setForm(null)}>إلغاء</Btn>
                <Btn onClick={save} disabled={!form.title.trim()}>{form.id ? "حفظ" : "إضافة"}</Btn>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* حركة دخول أعمدة */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="hidden" />
    </div>
  );
}
