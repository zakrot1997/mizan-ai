"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Area, AreaChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { ArrowDownLeft, ArrowUpLeft, Plus, Scale, Trash2, Wallet } from "lucide-react";
import { api, invalidate, useApi } from "@/lib/api";
import { on, toast } from "@/lib/bus";
import type { Project, Transaction } from "@/db/schema";
import { Badge, Btn, EmptyState, Field, GlassCard, IconBtn, Modal, Spinner } from "@/components/ui";
import { cn, fmtDateTime, fmtMoney } from "@/lib/utils";

type Overview = {
  finance: {
    income: number;
    expense: number;
    balance: number;
    monthly: { m: string; income: number; expense: number }[];
    categories: { name: string; value: number }[];
  };
};

const CATEGORIES = ["عام", "دفعة مشروع", "استشارات", "رواتب", "اشتراكات", "تسويق", "إعلانات", "معدات", "مكتب", "سفر"];

type TxForm = { kind: "income" | "expense"; amount: string; category: string; note: string; projectId: string; date: string };

export default function FinanceView() {
  const { data: ov, isLoading } = useApi<Overview>("/api/overview");
  const { data: txs } = useApi<Transaction[]>("/api/transactions");
  const { data: projects } = useApi<Project[]>("/api/projects");
  const [form, setForm] = useState<TxForm | null>(null);

  useEffect(
    () =>
      on("modal.open", (p) => {
        if (p === "tx-income" || p === "tx-expense") {
          openForm(p === "tx-income" ? "income" : "expense");
        }
      }),
    []
  );

  const openForm = (kind: "income" | "expense") =>
    setForm({ kind, amount: "", category: kind === "income" ? "دفعة مشروع" : "عام", note: "", projectId: "", date: "" });

  const save = async () => {
    if (!form) return;
    try {
      await api.post("/api/transactions", {
        kind: form.kind,
        amount: Number(form.amount),
        category: form.category,
        note: form.note || null,
        projectId: form.projectId || null,
        date: form.date || undefined,
      });
      invalidate(["/api/transactions", "/api/overview", "/api/projects"]);
      setForm(null);
      toast("سُجّلت المعاملة", "ok");
    } catch (e) {
      toast(e instanceof Error ? e.message : "فشل", "err");
    }
  };

  if (isLoading || !ov) return <Spinner />;
  const fin = ov.finance;
  const maxCat = Math.max(1, ...fin.categories.map((c) => c.value));

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      <div className="flex items-center gap-3">
        <h1 className="text-xl font-black text-white">المالية</h1>
        <div className="ms-auto flex gap-2">
          <Btn variant="soft" onClick={() => openForm("expense")}>
            <ArrowDownLeft size={15} className="text-rose-400" /> مصروف
          </Btn>
          <Btn onClick={() => openForm("income")}>
            <ArrowUpLeft size={15} /> إيراد
          </Btn>
        </div>
      </div>

      {/* الملخص */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: "الرصيد الحالي", value: fin.balance, color: fin.balance >= 0 ? "#34d399" : "#f87171", icon: Scale },
          { label: "إجمالي الإيرادات", value: fin.income, color: "#38bdf8", icon: ArrowUpLeft },
          { label: "إجمالي المصروفات", value: fin.expense, color: "#fb7185", icon: ArrowDownLeft },
        ].map((s, i) => (
          <motion.div key={s.label} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.06 }}>
            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{s.label}</span>
                <s.icon size={16} style={{ color: s.color }} />
              </div>
              <p className="mt-2 truncate text-xl font-black sm:text-2xl" style={{ color: s.color }}>
                {fmtMoney(s.value)}
              </p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        <GlassCard className="lg:col-span-3">
          <h3 className="mb-2 text-sm font-bold text-white">التدفق الشهري</h3>
          <div dir="ltr" className="h-52">
            <ResponsiveContainer>
              <AreaChart data={fin.monthly} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="fInc" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#38bdf8" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#38bdf8" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="fExp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#fb7185" stopOpacity={0.35} />
                    <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="m" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: "#0d1422", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, fontSize: 12 }} />
                <Area type="monotone" dataKey="income" name="إيرادات" stroke="#38bdf8" strokeWidth={2.5} fill="url(#fInc)" />
                <Area type="monotone" dataKey="expense" name="مصروفات" stroke="#fb7185" strokeWidth={2} fill="url(#fExp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </GlassCard>

        <GlassCard className="lg:col-span-2">
          <h3 className="mb-4 text-sm font-bold text-white">فئات الصرف</h3>
          <div className="space-y-3">
            {fin.categories.length === 0 && <p className="py-3 text-center text-xs text-slate-500">لا مصروفات مسجلة</p>}
            {fin.categories.map((c) => (
              <div key={c.name}>
                <div className="mb-1 flex items-center justify-between text-[11px]">
                  <span className="font-semibold text-slate-300">{c.name}</span>
                  <span className="text-slate-500">{fmtMoney(c.value)}</span>
                </div>
                <div className="h-1.5 overflow-hidden rounded-full bg-white/8">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-l from-rose-400 to-orange-300"
                    initial={{ width: 0 }}
                    animate={{ width: `${(c.value / maxCat) * 100}%` }}
                    transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
                  />
                </div>
              </div>
            ))}
          </div>
        </GlassCard>
      </div>

      {/* سجل المعاملات */}
      <GlassCard>
        <h3 className="mb-3 text-sm font-bold text-white">سجل المعاملات</h3>
        {(txs ?? []).length === 0 ? (
          <EmptyState icon={<Wallet size={24} />} title="لا معاملات" hint="سجّل أول إيراد أو مصروف — أو اطلب من الوكيل: «سجّل مصروف 1200 اشتراكات»" action={<Btn onClick={() => openForm("income")}><Plus size={14} /> معاملة جديدة</Btn>} />
        ) : (
          <div className="divide-y divide-white/5">
            {(txs ?? []).map((t) => (
              <div key={t.id} className="group flex items-center gap-3 py-2.5">
                <span
                  className={cn(
                    "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                    t.kind === "income" ? "bg-emerald-500/12 text-emerald-300" : "bg-rose-500/12 text-rose-300"
                  )}
                >
                  {t.kind === "income" ? <ArrowUpLeft size={15} /> : <ArrowDownLeft size={15} />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-bold text-slate-200">{t.note || t.category}</p>
                  <p className="text-[11px] text-slate-500">{fmtDateTime(t.date)}</p>
                </div>
                <Badge color={t.kind === "income" ? "#34d399" : "#fb7185"}>{t.category}</Badge>
                <span className={cn("w-28 text-end text-sm font-black", t.kind === "income" ? "text-emerald-400" : "text-rose-400")}>
                  {t.kind === "income" ? "+" : "−"}{fmtMoney(t.amount)}
                </span>
                <IconBtn
                  title="حذف"
                  className="h-8 w-8 opacity-0 transition-opacity group-hover:opacity-100 hover:!bg-rose-500/15 hover:!text-rose-300"
                  onClick={async () => {
                    await api.del("/api/transactions", { id: t.id });
                    invalidate(["/api/transactions", "/api/overview"]);
                  }}
                >
                  <Trash2 size={13} />
                </IconBtn>
              </div>
            ))}
          </div>
        )}
      </GlassCard>

      <Modal open={!!form} onClose={() => setForm(null)} title={form?.kind === "income" ? "تسجيل إيراد" : "تسجيل مصروف"}>
        {form && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-2 rounded-2xl bg-white/5 p-1.5">
              {(["income", "expense"] as const).map((k) => (
                <button
                  key={k}
                  onClick={() => setForm({ ...form, kind: k })}
                  className={cn(
                    "rounded-xl py-2 text-sm font-bold transition-all",
                    form.kind === k
                      ? k === "income"
                        ? "bg-emerald-500/20 text-emerald-300 border border-emerald-400/30"
                        : "bg-rose-500/20 text-rose-300 border border-rose-400/30"
                      : "text-slate-500 border border-transparent"
                  )}
                >
                  {k === "income" ? "إيراد +" : "مصروف −"}
                </button>
              ))}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <Field label="المبلغ">
                <input className="inp" type="number" min={0} value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} autoFocus />
              </Field>
              <Field label="الفئة">
                <select className="inp" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })}>
                  {CATEGORIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="ربط بمشروع (اختياري)">
                <select className="inp" value={form.projectId} onChange={(e) => setForm({ ...form, projectId: e.target.value })}>
                  <option value="">— بدون —</option>
                  {(projects ?? []).map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
              </Field>
              <Field label="التاريخ (افتراضي: الآن)">
                <input className="inp" type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} />
              </Field>
            </div>
            <Field label="ملاحظة">
              <input className="inp" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="الدفعة الثانية من…" />
            </Field>
            <div className="flex justify-end gap-2 pt-1">
              <Btn variant="ghost" onClick={() => setForm(null)}>إلغاء</Btn>
              <Btn onClick={save} disabled={!Number(form.amount)}>تسجيل</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}
