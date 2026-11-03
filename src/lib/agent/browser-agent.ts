"use client";

/**
 * حلقة الوكيل عند تشغيل النموذج داخل المتصفح (wllama):
 * نفس أدوات النظام لكن عبر بروتوكول <action> و REST.
 */
import { buildSystemPrompt } from "@/lib/ai/system";
import { parseActions, splitStreamSafe, type AgentEvent, type SideAction } from "@/lib/ai/protocol";
import { chatStream } from "./wllama-engine";
import { executeClientTool } from "./client-tools";

export async function runBrowserAgent(
  history: { role: string; content: string }[],
  emit: (e: AgentEvent) => void
) {
  let snapshot = "";
  try {
    const res = await fetch("/api/overview");
    const ov = await res.json();
    snapshot = JSON.stringify({ العدادات: ov.counts, الرصيد: ov.finance?.balance });
  } catch {
    /* ignore */
  }

  const messages: { role: string; content: string }[] = [
    { role: "system", content: buildSystemPrompt({ jsonProtocol: true, snapshot }) },
    ...history.slice(-10),
  ];

  let emitted = "";
  for (let round = 0; round < 5; round++) {
    let raw = "";
    let safeLen = 0;
    const final = await chatStream(messages, (piece) => {
      raw += piece;
      const { safe } = splitStreamSafe(raw);
      if (safe.length > safeLen) {
        const delta = safe.slice(safeLen);
        safeLen = safe.length;
        emitted += delta;
        emit({ type: "token", text: delta });
      }
    });
    raw = final || raw;

    const { clean, actions } = parseActions(raw);
    if (clean.length > emitted.length) {
      emit({ type: "token", text: clean.slice(emitted.length) });
    }
    emitted = "";

    if (actions.length === 0) return;

    messages.push({ role: "assistant", content: raw });
    const results: string[] = [];
    const side: SideAction[] = [];
    for (const a of actions) {
      const id = `b${round}_${results.length}`;
      emit({ type: "tool", id, name: a.name, status: "start" });
      try {
        const r = await executeClientTool(a.name, a.args);
        results.push(`${a.name}: ${JSON.stringify(r.result).slice(0, 600)}`);
        if (r.actions) side.push(...r.actions);
        emit({ type: "tool", id, name: a.name, status: "end" });
      } catch (e) {
        results.push(`${a.name}: خطأ`);
        emit({ type: "tool", id, name: a.name, status: "end", result: e instanceof Error ? e.message : "" });
      }
    }
    if (side.length) emit({ type: "actions", actions: side });
    messages.push({
      role: "user",
      content: `نتائج الأدوات:\n${results.join("\n")}\n\nأجب المستخدم بعربية موجزة الآن.`,
    });
  }
}
