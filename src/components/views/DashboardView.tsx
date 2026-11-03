"use client";

import { Area, AreaChart, Cell, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis } from "recharts";
import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpLeft,
  Briefcase,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { useApi } from "@/lib/api";
import { emit } from "@/lib/bus";
import { GlassCard, Spinner, Badge } from "@/components/ui";
import { fmtMoney, fmtInt, timeAgo, TASK_STATUS_LABEL, TASK_STATUS_COLOR, cn } from "@/lib/utils";

type Overview = {
  counts: { projects: number; projectsTotal: number; tasksOpen: number; tasksDone: number; clients: number };
  finance: {
    income: number;
    expense: number;
    balance: number;
    monthly: { m: string; income: number; expense: number }[];
    categories: { name: string; value: number }[];
  };
  tasksByStatus: { status: string; count: number }[];
  topProjects: { id: string; name: string; color: string; progress: number; status: string; openTasks: number }[];
  recent: { type: "task" | "tx"; title: string; at: string }[];
};

const fade = (i: number) => ({
  initial: { opacity: 0, y: 14 },
  animate: { opacity: 1, y: 0 },
  transition: { delay: i * 0.06, duration: 0.45, ease: [0.22, 1, 0.36, 1] as const },
});

export default function DashboardView() {
  const { data, isLoading } = useApi<Overview>("/api/overview");

  if (isLoading || !data) return <Spinner label="يجمع ميزان بياناتك…" />;

  const stats = [
    { label: "مشاريع نشطة", value: data.counts.projects, icon: Briefcase, color: "#22d3ee", sub: `${fmtInt(data.counts.projectsTotal)} إجمالاً` },
    { label: "مهام مفتوحة", value: data.counts.tasksOpen, icon: Clock, color: "#a78bfa", sub: `${fmtInt(data.counts.tasksDone)} منجزة` },
    { label: "الرصيد", value: data.finance.balance, icon: TrendingUp, color: data.finance.balance >= 0 ? "#34d399" : "#f87171", money: true, sub: "إيرادات − مصروفات" },
    { label: "العملاء", value: data.counts.clients, icon: Users, color: "#fbbf24", sub: "ملفات نشطة" },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-5 p-6">
      {/* ترحيب + الموجز الذكي */}
      <motion.div {...fade(0)} className="relative overflow-hidden rounded-3xl border border-white/8 bg-gradient-to-l from-cyan-500/12 via-[#0d1422] to-violet-500/12 p-6">
        <div className="pointer-events-none absolute -start-24 -top-24 h-72 w-72 rounded-full bg-cyan-500/15 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-28 -end-16 h-72 w-72 rounded-full bg-violet-500/15 blur-3xl" />
        <div className="relative flex flex-wrap items-center gap-4">
          <div>
            <h1 className="text-2xl font-black text-white">مكتبك الذكي تحت السيطرة</h1>
            <p className="mt-1 text-sm text-slate-400">
              {fmtInt(data.counts.tasksOpen)} مهمة تنتظرك عبر {fmtInt(data.counts.projects)} مشاريع نشطة — والرصيد الحالي{" "}
              <span className={cn("font-bold", data.finance.balance >= 0 ? "text-emerald-400" : "text-rose-400")}>
                {fmtMoney(data.finance.balance)}
              </span>
            </p>
          </div>
          <button
            onClick={() => emit("copilot.prompt", "أعطني موجزاً تنفيذياً لأعمالي الآن مع 3 توصيات عملية")}
            className="btn-primary ms-auto"
          >
            <Sparkles size={15} />
            موجز ذكي فوري
          </button>
        </div>
      </motion.div>

      {/* بطاقات الأرقام */}
      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s, i) => (
          <motion.div key={s.label} {...fade(i + 1)}>
            <GlassCard className="p-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-400">{s.label}</span>
                <span className="grid h-9 w-9 place-items-center rounded-xl" style={{ background: `${s.color}1a`, color: s.color }}>
                  <s.icon size={16} />
                </span>
              </div>
              <p className="mt-2 text-2xl font-black text-white" style={{ textShadow: `0 0 30px ${s.color}55` }}>
                {s.money ? fmtMoney(s.value) : fmtInt(s.value)}
              </p>
              <p className="mt-0.5 text-[11px] text-slate-500">{s.sub}</p>
            </GlassCard>
          </motion.div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* التدفق المالي */}
        <motion.div {...fade(5)} className="lg:col-span-3">
          <GlassCard className="h-full">
            <div className="mb-3 flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">التدفق المالي — آخر 6 أشهر</h3>
              <div className="flex gap-3 text-[11px]">
                <span className="flex items-center gap-1 text-emerald-300"><ArrowUpLeft size={12} /> إيرادات {fmtMoney(data.finance.income)}</span>
                <span className="flex items-center gap-1 text-rose-300"><ArrowDownLeft size={12} /> مصروفات {fmtMoney(data.finance.expense)}</span>
              </div>
            </div>
            <div dir="ltr" className="h-56">
              <ResponsiveContainer>
                <AreaChart data={data.finance.monthly} margin={{ top: 6, right: 4, left: 4, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gInc" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#34d399" stopOpacity={0.45} />
                      <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gExp" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#fb7185" stopOpacity={0.4} />
                      <stop offset="100%" stopColor="#fb7185" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="m" tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <Tooltip
                    contentStyle={{ background: "#0d1422", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, fontSize: 12 }}
                    labelStyle={{ color: "#94a3b8" }}
                  />
                  <Area type="monotone" dataKey="income" name="إيرادات" stroke="#34d399" strokeWidth={2.5} fill="url(#gInc)" />
                  <Area type="monotone" dataKey="expense" name="مصروفات" stroke="#fb7185" strokeWidth={2} fill="url(#gExp)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </GlassCard>
        </motion.div>

        {/* توزيع المهام */}
        <motion.div {...fade(6)} className="lg:col-span-2">
          <GlassCard className="h-full">
            <h3 className="mb-2 text-sm font-bold text-white">توزيع المهام</h3>
            <div dir="ltr" className="h-40">
              <ResponsiveContainer>
                <PieChart>
                  <Pie data={data.tasksByStatus} dataKey="count" nameKey="status" innerRadius={45} outerRadius={68} paddingAngle={3} strokeWidth={0}>
                    {data.tasksByStatus.map((t) => (
                      <Cell key={t.status} fill={TASK_STATUS_COLOR[t.status]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: "#0d1422", border: "1px solid rgba(255,255,255,.1)", borderRadius: 12, fontSize: 12 }}
                    formatter={(v, n) => [String(v ?? ""), TASK_STATUS_LABEL[String(n)] ?? String(n ?? "")]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="mt-1 flex flex-wrap gap-1.5">
              {data.tasksByStatus.map((t) => (
                <Badge key={t.status} color={TASK_STATUS_COLOR[t.status]}>
                  {TASK_STATUS_LABEL[t.status]} · {fmtInt(t.count)}
                </Badge>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>

      <div className="grid gap-4 lg:grid-cols-5">
        {/* تقدم المشاريع */}
        <motion.div {...fade(7)} className="lg:col-span-3">
          <GlassCard>
            <h3 className="mb-4 text-sm font-bold text-white">تقدم المشاريع</h3>
            <div className="space-y-3.5">
              {data.topProjects.length === 0 && (
                <p className="py-4 text-center text-sm text-slate-500">لا مشاريع بعد — اطلب من الوكيل إنشاء أول مشروع</p>
              )}
              {data.topProjects.map((p) => (
                <div key={p.id} className="flex items-center gap-3">
                  <span className="h-8 w-1.5 rounded-full" style={{ background: p.color }} />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <p className="truncate text-[13px] font-bold text-slate-200">{p.name}</p>
                      <span className="text-[11px] font-bold" style={{ color: p.color }}>{p.progress}٪</span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-white/8">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: `linear-gradient(90deg, ${p.color}, ${p.color}88)` }}
                        initial={{ width: 0 }}
                        animate={{ width: `${p.progress}%` }}
                        transition={{ duration: 0.9, ease: [0.22, 1, 0.36, 1] }}
                      />
                    </div>
                  </div>
                  <Badge color={p.color}>{p.openTasks} مهمة</Badge>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>

        {/* آخر النشاطات */}
        <motion.div {...fade(8)} className="lg:col-span-2">
          <GlassCard>
            <h3 className="mb-3 text-sm font-bold text-white">آخر النشاطات</h3>
            <div className="space-y-1">
              {data.recent.length === 0 && <p className="py-4 text-center text-sm text-slate-500">لا نشاط بعد</p>}
              {data.recent.map((r, i) => (
                <div key={i} className="flex items-center gap-2.5 rounded-xl px-2 py-2 transition-colors hover:bg-white/4">
                  <span
                    className={cn(
                      "grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                      r.type === "task" ? "bg-violet-500/15 text-violet-300" : "bg-emerald-500/15 text-emerald-300"
                    )}
                  >
                    {r.type === "task" ? <CheckCircle2 size={13} /> : <TrendingUp size={13} />}
                  </span>
                  <p className="min-w-0 flex-1 truncate text-xs text-slate-300">{r.title}</p>
                  <span className="shrink-0 text-[10px] text-slate-600">{timeAgo(r.at)}</span>
                </div>
              ))}
            </div>
          </GlassCard>
        </motion.div>
      </div>
    </div>
  );
}
