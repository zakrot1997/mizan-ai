export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

const numFmt = new Intl.NumberFormat("ar-u-nu-latn", { maximumFractionDigits: 2 });
const intFmt = new Intl.NumberFormat("ar-u-nu-latn", { maximumFractionDigits: 0 });

export function fmtNum(n: number | null | undefined) {
  return numFmt.format(Number(n ?? 0));
}
export function fmtInt(n: number | null | undefined) {
  return intFmt.format(Number(n ?? 0));
}

export function fmtMoney(n: number | null | undefined, currency = "ر.س") {
  return `${numFmt.format(Number(n ?? 0))} ${currency}`;
}

export function fmtDate(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ar-u-nu-latn-ca-gregory", {
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(date);
}

export function fmtDateTime(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  return new Intl.DateTimeFormat("ar-u-nu-latn-ca-gregory", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function timeAgo(d: string | Date | null | undefined) {
  if (!d) return "—";
  const date = typeof d === "string" ? new Date(d) : d;
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "الآن";
  if (mins < 60) return `قبل ${mins} د`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `قبل ${hours} س`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `قبل ${days} يوم`;
  return fmtDate(date);
}

export const TASK_STATUSES = ["backlog", "todo", "doing", "review", "done"] as const;
export const TASK_STATUS_LABEL: Record<string, string> = {
  backlog: "مؤجلة",
  todo: "قيد الانتظار",
  doing: "جارٍ العمل",
  review: "مراجعة",
  done: "منجزة",
};
export const TASK_STATUS_COLOR: Record<string, string> = {
  backlog: "#64748b",
  todo: "#38bdf8",
  doing: "#a78bfa",
  review: "#fbbf24",
  done: "#34d399",
};
export const PRIORITY_LABEL: Record<string, string> = {
  low: "منخفضة",
  med: "متوسطة",
  high: "عالية",
  urgent: "عاجلة",
};
export const PRIORITY_COLOR: Record<string, string> = {
  low: "#64748b",
  med: "#38bdf8",
  high: "#fb923c",
  urgent: "#f87171",
};
export const PROJECT_STATUS_LABEL: Record<string, string> = {
  active: "نشط",
  paused: "متوقف",
  done: "مكتمل",
  archived: "مؤرشف",
};

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}
