"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Archive, FolderKanban, Pencil, Plus, Trash2 } from "lucide-react";
import { api, invalidate, useApi } from "@/lib/api";
import type { Project } from "@/db/schema";
import { Badge, Btn, EmptyState, Field, GlassCard, IconBtn, Modal, Ring, Spinner } from "@/components/ui";
import { cn, fmtDate, fmtMoney, PROJECT_STATUS_LABEL, TASK_STATUS_COLOR } from "@/lib/utils";
import { toast } from "@/lib/bus";

const COLORS = ["#22d3ee", "#a78bfa", "#34d399", "#fbbf24", "#fb7185", "#60a5fa", "#f472b6"];
const STATUS_FILTERS = [
  { id: "all", label: "الكل" },
  { id: "active", label: "نشطة" },
  { id: "paused", label: "متوقفة" },
  { id: "done", label: "مكتملة" },
  { id: "archived", label: "مؤرشفة" },
];

type Form = {
  id?: string;
  name: string;
  client: string;
  description: string;
  budget: string;
  status: string;
  progress: number;
  color: string;
  deadline: string;
};
const empty: Form = { name: "", client: "", description: "", budget: "", status: "active", progress: 0, color: COLORS[0], deadline: "" };

const STATUS_COLOR: Record<string, string> = {
  active: "#34d399",
  paused: "#fbbf24",
  done: "#38bdf8",
  archived: "#64748b",
};

export default function ProjectsView() {
  const { data, isLoading } = useApi<Project[]>("/api/projects");
  const [filter, setFilter] = useState("all");
  const [form, setForm] = useState<Form | null>(null);

  const rows = (data ?? []).filter((p) => filter === "all" || p.status === filter);

  const save = async () => {
    if (!form) return;
    const body = {
      name: form.name,
      client: form.client || null,
      description: form.description || null,
      budget: Number(form.budget) || 0,
      status: form.status,
      progress: form.progress,
      color: form.color,
      deadline: form.deadline || null,
    };
    try {
      if (form.id) await api.patch("/api/projects", { ...body, id: form.id });
      else await api.post("/api/projects", body);
      invalidate(["/api/projects", "/api/overview"]);
      setForm(null);
      toast(form.id ? "تم تحديث المشروع" : "تم إنشاء المشروع", "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل الحفظ", "err");
    }
  };

  const remove = async (id: string) => {
    if (!confirm("حذف المشروع نهائياً؟ (المهام المرتبطة ستُفك ارتباطها)")) return;
    await api.del("/api/projects", { id });
    invalidate(["/api/projects", "/api/overview"]);
    toast("تم حذف المشروع", "ok");
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-black text-white">المشاريع</h1>
        <div className="ms-3 flex gap-1.5">
          {STATUS_FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={cn(
                "rounded-full px-3 py-1.5 text-[11px] font-bold transition-all",
                filter === f.id
                  ? "bg-cyan-400/15 text-cyan-300 border border-cyan-400/30"
                  : "text-slate-500 hover:text-slate-300 border border-transparent"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <Btn className="ms-auto" onClick={() => setForm({ ...empty })}>
          <Plus size={15} /> مشروع جديد
        </Btn>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<FolderKanban size={26} />}
          title="لا مشاريع هنا"
          hint="أنشئ مشروعك الأول بنفسك أو اطلب من وكيل ميزان: «أنشئ مشروع متجر إلكتروني للعميل X بميزانية 50000»"
          action={<Btn onClick={() => setForm({ ...empty })}><Plus size={15} /> مشروع جديد</Btn>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {rows.map((p, i) => (
            <motion.div
              key={p.id}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05, duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            >
              <GlassCard glow={`${p.color}30`} className="group flex h-full flex-col">
                <div className="flex items-start justify-between">
                  <Ring value={p.progress} color={p.color} />
                  <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <IconBtn title="تعديل" className="h-8 w-8" onClick={() =>
                      setForm({
                        id: p.id,
                        name: p.name,
                        client: p.client ?? "",
                        description: p.description ?? "",
                        budget: String(p.budget || ""),
                        status: p.status,
                        progress: p.progress,
                        color: p.color,
                        deadline: p.deadline ? new Date(p.deadline).toISOString().slice(0, 10) : "",
                      })
                    }>
                      <Pencil size={14} />
                    </IconBtn>
                    <IconBtn title={p.status === "archived" ? "إلغاء الأرشفة" : "أرشفة"} className="h-8 w-8" onClick={async () => {
                      await api.patch("/api/projects", { id: p.id, status: p.status === "archived" ? "active" : "archived" });
                      invalidate(["/api/projects", "/api/overview"]);
                    }}>
                      <Archive size={14} />
                    </IconBtn>
                    <IconBtn title="حذف" className="h-8 w-8 hover:!bg-rose-500/15 hover:!text-rose-300" onClick={() => remove(p.id)}>
                      <Trash2 size={14} />
                    </IconBtn>
                  </div>
                </div>
                <h3 className="mt-3 text-base font-extrabold text-white">{p.name}</h3>
                {p.client && <p className="text-xs text-slate-500">{p.client}</p>}
                {p.description && <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-400">{p.description}</p>}
                <div className="mt-auto flex flex-wrap items-center gap-1.5 pt-4">
                  <Badge color={STATUS_COLOR[p.status] ?? "#64748b"}>{PROJECT_STATUS_LABEL[p.status] ?? p.status}</Badge>
                  {p.budget > 0 && (
                    <Badge color={p.spent > p.budget ? "#f87171" : "#38bdf8"}>
                      {fmtMoney(p.spent)} / {fmtMoney(p.budget)}
                    </Badge>
                  )}
                  {p.deadline && <Badge color={p.color}>{fmtDate(p.deadline)}</Badge>}
                </div>
              </GlassCard>
            </motion.div>
          ))}
        </div>
      )}

      {/* نموذج إنشاء/تعديل */}
      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "تعديل مشروع" : "مشروع جديد"}>
        {form && (
          <div className="space-y-4">
            <Field label="اسم المشروع">
              <input className="inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} placeholder="متجر إلكتروني…" autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="العميل">
                <input className="inp" value={form.client} onChange={(e) => setForm({ ...form, client: e.target.value })} />
              </Field>
              <Field label="الميزانية">
                <input className="inp" type="number" value={form.budget} onChange={(e) => setForm({ ...form, budget: e.target.value })} />
              </Field>
              <Field label="الحالة">
                <select className="inp" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {Object.entries(PROJECT_STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                </select>
              </Field>
              <Field label="موعد التسليم">
                <input className="inp" type="date" value={form.deadline} onChange={(e) => setForm({ ...form, deadline: e.target.value })} />
              </Field>
            </div>
            <Field label={`التقدم — ${form.progress}٪`}>
              <input type="range" min={0} max={100} value={form.progress} onChange={(e) => setForm({ ...form, progress: Number(e.target.value) })} className="w-full accent-cyan-400" />
            </Field>
            <Field label="اللون">
              <div className="flex gap-2">
                {COLORS.map((c) => (
                  <button
                    key={c}
                    onClick={() => setForm({ ...form, color: c })}
                    className={cn("h-7 w-7 rounded-full transition-transform", form.color === c && "scale-125 ring-2 ring-white/60")}
                    style={{ background: c }}
                  />
                ))}
              </div>
            </Field>
            <Field label="الوصف">
              <textarea className="inp min-h-20" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Btn variant="ghost" onClick={() => setForm(null)}>إلغاء</Btn>
              <Btn onClick={save} disabled={!form.name.trim()}>{form.id ? "حفظ التعديلات" : "إنشاء المشروع"}</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
