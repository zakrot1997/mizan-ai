"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { FileText, Pencil, Pin, PinOff, Plus, Sparkles, StickyNote, Trash2 } from "lucide-react";
import { api, invalidate, useApi } from "@/lib/api";
import { emit, toast } from "@/lib/bus";
import type { Note } from "@/db/schema";
import { Badge, Btn, EmptyState, Field, IconBtn, Modal, Spinner } from "@/components/ui";
import { cn, timeAgo } from "@/lib/utils";

type Form = { id?: string; title: string; body: string; kind: string };

export default function NotesView() {
  const { data, isLoading } = useApi<Note[]>("/api/notes");
  const [form, setForm] = useState<Form | null>(null);
  const [tab, setTab] = useState<"all" | "note" | "report">("all");

  const rows = (data ?? []).filter((n) => tab === "all" || n.kind === tab);

  const save = async () => {
    if (!form) return;
    try {
      if (form.id) await api.patch("/api/notes", form);
      else await api.post("/api/notes", form);
      invalidate(["/api/notes"]);
      setForm(null);
      toast("تم الحفظ", "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل", "err");
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div className="flex flex-wrap items-center gap-3">
        <h1 className="text-xl font-black text-white">الملاحظات والتقارير</h1>
        <div className="ms-2 flex gap-1.5">
          {[
            { id: "all", label: "الكل" },
            { id: "note", label: "ملاحظات" },
            { id: "report", label: "تقارير الوكيل" },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id as typeof tab)}
              className={cn(
                "rounded-full border px-3 py-1.5 text-[11px] font-bold transition-all",
                tab === t.id ? "border-cyan-400/30 bg-cyan-400/15 text-cyan-300" : "border-transparent text-slate-500 hover:text-slate-300"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div className="ms-auto flex gap-2">
          <Btn variant="soft" onClick={() => emit("copilot.prompt", "أنشئ تقريراً شاملاً عن أعمالي واحفظه في الملاحظات")}>
            <Sparkles size={14} /> تقرير ذكي
          </Btn>
          <Btn onClick={() => setForm({ title: "", body: "", kind: "note" })}>
            <Plus size={15} /> ملاحظة
          </Btn>
        </div>
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={<StickyNote size={26} />}
          title="لا عناصر هنا"
          hint="التقارير التي يولّدها الوكيل تُحفظ هنا تلقائياً — جرّب زر «تقرير ذكي»"
          action={<Btn onClick={() => setForm({ title: "", body: "", kind: "note" })}><Plus size={15} /> ملاحظة جديدة</Btn>}
        />
      ) : (
        <div className="columns-1 gap-4 sm:columns-2 lg:columns-3 [&>*]:mb-4">
          {rows.map((n, i) => (
            <motion.div
              key={n.id}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: Math.min(i, 8) * 0.04 }}
              className="break-inside-avoid"
            >
              <div
                className={cn(
                  "glass group rounded-2xl p-5",
                  n.kind === "report" && "border-violet-400/20 bg-gradient-to-b from-violet-500/8 to-transparent"
                )}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {n.kind === "report" ? (
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-violet-500/15 text-violet-300"><FileText size={14} /></span>
                    ) : (
                      <span className="grid h-8 w-8 place-items-center rounded-lg bg-cyan-500/12 text-cyan-300"><StickyNote size={14} /></span>
                    )}
                    <h3 className="text-sm font-extrabold text-white">{n.title}</h3>
                  </div>
                  <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                    <IconBtn title={n.pinned ? "إلغاء التثبيت" : "تثبيت"} className="h-8 w-8" onClick={async () => {
                      await api.patch("/api/notes", { id: n.id, pinned: !n.pinned });
                      invalidate(["/api/notes"]);
                    }}>
                      {n.pinned ? <PinOff size={13} /> : <Pin size={13} />}
                    </IconBtn>
                    <IconBtn title="تعديل" className="h-8 w-8" onClick={() => setForm({ id: n.id, title: n.title, body: n.body, kind: n.kind })}>
                      <Pencil size={13} />
                    </IconBtn>
                    <IconBtn title="حذف" className="h-8 w-8 hover:!bg-rose-500/15 hover:!text-rose-300" onClick={async () => {
                      await api.del("/api/notes", { id: n.id });
                      invalidate(["/api/notes"]);
                    }}>
                      <Trash2 size={13} />
                    </IconBtn>
                  </div>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-xs leading-relaxed text-slate-400 line-clamp-[10]">{n.body}</p>
                <div className="mt-3 flex items-center gap-2">
                  {n.kind === "report" && <Badge color="#a78bfa">تقرير</Badge>}
                  {n.pinned && <Badge color="#fbbf24">مثبتة</Badge>}
                  <span className="ms-auto text-[10px] text-slate-600">{timeAgo(n.updatedAt)}</span>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "تعديل" : "ملاحظة جديدة"}>
        {form && (
          <div className="space-y-4">
            <Field label="العنوان">
              <input className="inp" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} autoFocus />
            </Field>
            <Field label="المحتوى">
              <textarea className="inp min-h-44" value={form.body} onChange={(e) => setForm({ ...form, body: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Btn variant="ghost" onClick={() => setForm(null)}>إلغاء</Btn>
              <Btn onClick={save} disabled={!form.title.trim()}>{form.id ? "حفظ" : "إضافة"}</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
