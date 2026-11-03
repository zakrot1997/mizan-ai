"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Bot,
  ChevronLeft,
  Globe,
  Hammer,
  Loader2,
  SendHorizonal,
  Sparkles,
  Square,
  Trash2,
  User,
  Wrench,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useApi, invalidate } from "@/lib/api";
import { browserOpen, navigate, on, toast } from "@/lib/bus";
import type { AgentEvent, SideAction } from "@/lib/ai/protocol";
import { runBrowserAgent } from "@/lib/agent/browser-agent";
import type { Engine } from "@/lib/engine";
import { ENGINE_META } from "@/lib/engine";
import { IconBtn } from "@/components/ui";

type ToolRun = { id: string; name: string; status: "start" | "end" };
type Msg = {
  role: "user" | "assistant";
  content: string;
  tools?: ToolRun[];
  error?: boolean;
};

const TOOL_AR: Record<string, string> = {
  get_overview: "قراءة نظرة الأعمال",
  list_projects: "استعراض المشاريع",
  create_project: "إنشاء مشروع",
  update_project: "تحديث مشروع",
  list_tasks: "استعراض المهام",
  create_task: "إضافة مهمة",
  move_task: "نقل مهمة",
  add_transaction: "تسجيل معاملة مالية",
  finance_summary: "تحليل مالي",
  list_clients: "استعراض العملاء",
  add_client: "إضافة عميل",
  create_note: "حفظ ملاحظة/تقرير",
  navigate: "التنقل في البرنامج",
  browser_open: "فتح المتصفح المدمج",
  browser_read: "قراءة صفحة ويب",
};

const QUICK = [
  "أعطني موجزاً تنفيذياً عن وضع أعمالي الآن",
  "أنشئ تقريراً أسبوعياً واحفظه في الملاحظات",
  "افتح المتصفح على ويكيبيديا ولخّص لي صفحة الذكاء الاصطناعي",
  "أضف مهمة: متابعة العملاء المتأخرين في السداد — أولوية عالية",
];

function applySideActions(actions: SideAction[]) {
  for (const a of actions) {
    if (a.kind === "invalidate") invalidate(a.keys);
    else if (a.kind === "browser.open") browserOpen(a.url);
    else if (a.kind === "navigate") navigate(a.view);
  }
}

export default function Copilot({
  open,
  onClose,
  engine,
}: {
  open: boolean;
  onClose: () => void;
  engine: Engine;
}) {
  const { data: settings } = useApi<{
    cloud: { hasKey: boolean; model: string };
    server: { modelFile: string };
  }>("/api/settings");
  const [messages, setMessages] = useState<Msg[]>([
    {
      role: "assistant",
      content:
        "أهلاً بك في ميزان. أنا وكيلك الذكي: أدير مشاريعك ومهامك وماليتك، وأتحكم في المتصفح المدمج لأبحث عن المعلومات. جرّب أحد الاقتراحات بالأسفل أو اكتب طلبك.",
    },
  ]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const abortRef = useRef<AbortController | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return on("copilot.prompt", (p) => {
      if (typeof p === "string") setInput(p);
      toast("اكتب بقية النص واضغط إرسال", "info");
    });
  }, []);

  useEffect(() => {
    listRef.current?.scrollTo({ top: 999999, behavior: "smooth" });
  }, [messages, busy]);

  const run = async (text: string) => {
    const clean = text.trim();
    if (!clean || busy) return;
    setInput("");
    setBusy(true);

    const base: Msg[] = [...messages, { role: "user", content: clean }];
    setMessages([...base, { role: "assistant", content: "", tools: [] }]);

    const updateAssistant = (fn: (m: Msg) => Msg) =>
      setMessages((prev) => {
        const next = [...prev];
        const i = next.length - 1;
        next[i] = fn({ ...next[i], tools: next[i].tools ? [...next[i].tools!] : [] });
        return next;
      });

    const emit = (e: AgentEvent) => {
      if (e.type === "token") {
        updateAssistant((m) => ({ ...m, content: m.content + e.text }));
      } else if (e.type === "tool") {
        updateAssistant((m) => {
          const tools = m.tools ?? [];
          const found = tools.find((t) => t.id === e.id);
          if (found) found.status = e.status;
          else tools.push({ id: e.id, name: e.name, status: e.status });
          return { ...m, tools };
        });
      } else if (e.type === "actions") {
        applySideActions(e.actions);
      } else if (e.type === "error") {
        updateAssistant((m) => ({
          ...m,
          content: m.content + (m.content ? "\n\n" : "") + e.message,
          error: true,
        }));
      }
    };

    try {
      if (engine === "in_browser") {
        await runBrowserAgent(
          base.map((m) => ({ role: m.role, content: m.content })),
          emit
        );
      } else {
        const ctrl = new AbortController();
        abortRef.current = ctrl;
        const res = await fetch("/api/chat", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            mode: engine,
            messages: base.map((m) => ({ role: m.role, content: m.content })),
          }),
          signal: ctrl.signal,
        });
        if (!res.ok || !res.body) throw new Error(`خطأ ${res.status}`);
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buf = "";
        for (;;) {
          const { done, value } = await reader.read();
          if (done) break;
          buf += decoder.decode(value, { stream: true });
          const blocks = buf.split("\n\n");
          buf = blocks.pop() ?? "";
          for (const block of blocks) {
            const evLine = block.match(/^event: (.+)$/m)?.[1];
            const dataLine = block.match(/^data: ([\s\S]+)$/m)?.[1];
            if (!evLine || !dataLine) continue;
            try {
              const data = JSON.parse(dataLine);
              emit({ type: evLine as AgentEvent["type"], ...data } as AgentEvent);
            } catch {
              /* ignore */
            }
          }
        }
        abortRef.current = null;
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") {
        updateAssistant((m) => ({
          ...m,
          content:
            m.content +
            (m.content ? "\n\n" : "") +
            `تعذّر الاتصال بالنموذج: ${e instanceof Error ? e.message : "خطأ غير معروف"}`,
          error: true,
        }));
      }
    }
    setBusy(false);
  };

  const meta = ENGINE_META[engine];

  return (
    <AnimatePresence>
      {open && (
        <motion.aside
          initial={{ width: 0, opacity: 0 }}
          animate={{ width: 390, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 34 }}
          className="z-30 flex h-full shrink-0 flex-col overflow-hidden border-s border-white/8 bg-[#0b0f19]/95 backdrop-blur-xl"
        >
          {/* الترويسة */}
          <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
            <div className="relative">
              <div className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-violet-500/30 to-cyan-400/20 text-violet-300">
                <Sparkles size={17} />
              </div>
              <span
                className="absolute -bottom-0.5 -end-0.5 h-2.5 w-2.5 rounded-full border-2 border-[#0b0f19]"
                style={{ background: meta.color }}
              />
            </div>
            <div className="leading-tight">
              <p className="text-[13px] font-extrabold text-white">وكيل ميزان</p>
              <p className="text-[10.5px]" style={{ color: meta.color }}>
                {meta.label}
                {engine === "cloud" && settings?.cloud?.model ? ` — ${settings.cloud.model}` : ""}
                {engine === "local_server" ? ` — ${settings?.server?.modelFile ?? "GGUF"}` : ""}
              </p>
            </div>
            <div className="ms-auto flex items-center gap-1">
              <IconBtn title="مسح المحادثة" onClick={() => setMessages((m) => [m[0]])}>
                <Trash2 size={15} />
              </IconBtn>
              <IconBtn title="طي اللوحة" onClick={onClose}>
                <ChevronLeft size={16} />
              </IconBtn>
            </div>
          </div>

          {/* الرسائل */}
          <div ref={listRef} className="flex-1 space-y-4 overflow-y-auto px-4 py-4">
            {messages.map((m, i) => (
              <div key={i} className={cn("flex gap-2.5", m.role === "user" && "flex-row-reverse")}>
                <div
                  className={cn(
                    "mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg",
                    m.role === "assistant"
                      ? "bg-gradient-to-br from-violet-500/25 to-cyan-400/15 text-violet-300"
                      : "bg-white/8 text-slate-300"
                  )}
                >
                  {m.role === "assistant" ? <Bot size={14} /> : <User size={14} />}
                </div>
                <div
                  className={cn(
                    "max-w-[82%] rounded-2xl px-3.5 py-2.5 text-[13px] leading-relaxed",
                    m.role === "assistant"
                      ? m.error
                        ? "border border-rose-500/25 bg-rose-500/8 text-rose-200"
                        : "border border-white/8 bg-white/5 text-slate-200"
                      : "bg-gradient-to-br from-cyan-500/25 to-violet-500/20 text-white"
                  )}
                >
                  {m.tools && m.tools.length > 0 && (
                    <div className="mb-2 flex flex-wrap gap-1.5">
                      {m.tools.map((t) => (
                        <span
                          key={t.id}
                          className={cn(
                            "inline-flex items-center gap-1.5 rounded-lg border px-2 py-1 text-[10.5px] font-semibold",
                            t.status === "start"
                              ? "border-amber-400/30 bg-amber-400/10 text-amber-300"
                              : "border-emerald-400/25 bg-emerald-400/10 text-emerald-300"
                          )}
                        >
                          {t.status === "start" ? (
                            <Loader2 size={11} className="animate-spin" />
                          ) : t.name === "navigate" ? (
                            <Wrench size={11} />
                          ) : t.name.startsWith("browser") ? (
                            <Globe size={11} />
                          ) : (
                            <Hammer size={11} />
                          )}
                          {TOOL_AR[t.name] ?? t.name}
                        </span>
                      ))}
                    </div>
                  )}
                  {m.content ? (
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  ) : (
                    m.role === "assistant" && (
                      <span className="flex items-center gap-2 text-slate-500">
                        <Loader2 size={13} className="animate-spin" />
                        يفكّر…
                      </span>
                    )
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* اقتراحات */}
          {messages.length <= 1 && (
            <div className="flex flex-wrap gap-2 px-4 pb-2">
              {QUICK.map((q) => (
                <button
                  key={q}
                  onClick={() => run(q)}
                  className="rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] text-slate-300 transition-all hover:border-cyan-400/40 hover:text-white"
                >
                  {q}
                </button>
              ))}
            </div>
          )}

          {/* الإدخال */}
          <div className="border-t border-white/8 p-3">
            <div className="flex items-end gap-2 rounded-2xl border border-white/10 bg-white/5 p-2 focus-within:border-cyan-400/40">
              <textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    run(input);
                  }
                }}
                rows={1}
                placeholder={
                  engine === "cloud" && !settings?.cloud?.hasKey
                    ? "أضف مفتاح API من الإعدادات أولاً…"
                    : "اطلب من ميزان أي شيء… (Enter للإرسال)"
                }
                className="max-h-28 min-h-[36px] flex-1 resize-none bg-transparent px-2 py-1.5 text-[13px] text-white outline-none placeholder:text-slate-500"
              />
              {busy ? (
                <button
                  onClick={() => abortRef.current?.abort()}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-rose-500/20 text-rose-300 transition-colors hover:bg-rose-500/30"
                  title="إيقاف"
                >
                  <Square size={14} />
                </button>
              ) : (
                <button
                  onClick={() => run(input)}
                  disabled={!input.trim()}
                  className="grid h-9 w-9 place-items-center rounded-xl bg-gradient-to-br from-cyan-500 to-violet-500 text-white transition-all hover:opacity-90 disabled:opacity-40"
                  title="إرسال"
                >
                  <SendHorizonal size={15} className="-scale-x-100" />
                </button>
              )}
            </div>
            <p className="mt-2 text-center text-[10px] text-slate-600">
              {meta.desc}
            </p>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}
