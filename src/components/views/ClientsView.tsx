"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Building2, Mail, Phone, Pencil, Plus, Trash2, Users } from "lucide-react";
import { api, invalidate, useApi } from "@/lib/api";
import { toast } from "@/lib/bus";
import type { Client } from "@/db/schema";
import { Badge, Btn, EmptyState, Field, GlassCard, IconBtn, Modal, Spinner } from "@/components/ui";
import { cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; color: string }> = {
  lead: { label: "محتمل", color: "#fbbf24" },
  active: { label: "نشط", color: "#34d399" },
  archived: { label: "مؤرشف", color: "#64748b" },
};
const AVATARS = ["from-cyan-500 to-blue-600", "from-violet-500 to-purple-600", "from-emerald-500 to-teal-600", "from-amber-500 to-orange-600", "from-rose-500 to-pink-600"];

type Form = { id?: string; name: string; company: string; email: string; phone: string; status: string; notes: string };
const empty: Form = { name: "", company: "", email: "", phone: "", status: "lead", notes: "" };

export default function ClientsView() {
  const { data, isLoading } = useApi<Client[]>("/api/clients");
  const [form, setForm] = useState<Form | null>(null);

  const save = async () => {
    if (!form) return;
    try {
      const body = { ...form, company: form.company || null, email: form.email || null, phone: form.phone || null, notes: form.notes || null };
      if (form.id) await api.patch("/api/clients", body);
      else await api.post("/api/clients", body);
      invalidate(["/api/clients", "/api/overview"]);
      setForm(null);
      toast("تم الحفظ", "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل", "err");
    }
  };

  if (isLoading) return <Spinner />;

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-black text-white">العملاء</h1>
        <Btn className="ms-auto" onClick={() => setForm({ ...empty })}>
          <Plus size={15} /> عميل جديد
        </Btn>
      </div>

      {(data ?? []).length === 0 ? (
        <EmptyState
          icon={<Users size={26} />}
          title="لا عملاء بعد"
          hint="أضف عملاءك أو اطلب من الوكيل: «أضف عميل شركة الأفق هاتفه 0501234567»"
          action={<Btn onClick={() => setForm({ ...empty })}><Plus size={15} /> عميل جديد</Btn>}
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(data ?? []).map((c, i) => {
            const grad = AVATARS[c.name.length % AVATARS.length];
            const st = STATUS[c.status] ?? STATUS.lead;
            return (
              <motion.div key={c.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <GlassCard className="group h-full">
                  <div className="flex items-start gap-3">
                    <div className={cn("grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-gradient-to-br text-lg font-black text-white", grad)}>
                      {c.name.trim().charAt(0)}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-white">{c.name}</p>
                      {c.company && (
                        <p className="mt-0.5 flex items-center gap-1 text-xs text-slate-500">
                          <Building2 size={11} /> {c.company}
                        </p>
                      )}
                      <div className="mt-2">
                        <Badge color={st.color}>{st.label}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-0.5 opacity-0 transition-opacity group-hover:opacity-100">
                      <IconBtn title="تعديل" className="h-8 w-8" onClick={() =>
                        setForm({
                          id: c.id,
                          name: c.name,
                          company: c.company ?? "",
                          email: c.email ?? "",
                          phone: c.phone ?? "",
                          status: c.status,
                          notes: c.notes ?? "",
                        })
                      }>
                        <Pencil size={13} />
                      </IconBtn>
                      <IconBtn title="حذف" className="h-8 w-8 hover:!bg-rose-500/15 hover:!text-rose-300" onClick={async () => {
                        if (!confirm(`حذف العميل «${c.name}»؟`)) return;
                        await api.del("/api/clients", { id: c.id });
                        invalidate(["/api/clients", "/api/overview"]);
                      }}>
                        <Trash2 size={13} />
                      </IconBtn>
                    </div>
                  </div>
                  <div className="mt-4 space-y-1.5 text-xs text-slate-400">
                    {c.email && <p className="flex items-center gap-2"><Mail size={12} className="text-slate-600" /><span dir="ltr">{c.email}</span></p>}
                    {c.phone && <p className="flex items-center gap-2"><Phone size={12} className="text-slate-600" /><span dir="ltr">{c.phone}</span></p>}
                    {c.notes && <p className="line-clamp-2 leading-relaxed text-slate-500">{c.notes}</p>}
                  </div>
                </GlassCard>
              </motion.div>
            );
          })}
        </div>
      )}

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.id ? "تعديل عميل" : "عميل جديد"}>
        {form && (
          <div className="space-y-4">
            <Field label="الاسم">
              <input className="inp" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} autoFocus />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label="الشركة">
                <input className="inp" value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
              </Field>
              <Field label="الحالة">
                <select className="inp" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })}>
                  {Object.entries(STATUS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
                </select>
              </Field>
              <Field label="البريد">
                <input className="inp" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
              </Field>
              <Field label="الهاتف">
                <input className="inp" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
              </Field>
            </div>
            <Field label="ملاحظات">
              <textarea className="inp min-h-20" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Btn variant="ghost" onClick={() => setForm(null)}>إلغاء</Btn>
              <Btn onClick={save} disabled={!form.name.trim()}>{form.id ? "حفظ" : "إضافة"}</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
