import { db } from "@/db";
import { chatMessages } from "@/db/schema";
import { buildSystemPrompt } from "@/lib/ai/system";
import { TOOL_DEFS } from "@/lib/ai/tools";
import { executeTool } from "@/lib/ai/executors";
import { parseActions, splitStreamSafe, type SideAction } from "@/lib/ai/protocol";
import { loadAiSettings } from "../settings/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 180;

type ToolCall = {
  id: string;
  type: "function";
  function: { name: string; arguments: string };
};
type Msg = {
  role: string;
  content: string | null;
  tool_calls?: ToolCall[];
  tool_call_id?: string;
};

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const history = (body.messages ?? []) as { role: string; content: string }[];
  const userText = history[history.length - 1]?.content ?? "";
  const s = await loadAiSettings();
  const mode: string = body.mode ?? s.engine;

  const jsonProtocol = mode === "local_server";
  const baseUrl = jsonProtocol
    ? (s.server.url || "http://127.0.0.1:8080/v1").replace(/\/$/, "")
    : (s.cloud.baseUrl || "https://api.openai.com/v1").replace(/\/$/, "");
  const apiKey = jsonProtocol ? "local" : s.cloud.apiKey || "";
  const model = jsonProtocol ? s.server.model || "local" : s.cloud.model || "gpt-4o-mini";

  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (event: string, data: unknown) => {
        try {
          controller.enqueue(
            encoder.encode(`event: ${event}\ndata: ${JSON.stringify(data)}\n\n`)
          );
        } catch {
          /* closed */
        }
      };
      const close = () => {
        try {
          controller.close();
        } catch {
          /* noop */
        }
      };

      try {
        if (!jsonProtocol && !apiKey) {
          send("error", {
            message:
              "لا يوجد مفتاح API سحابي. افتح «الإعدادات › محرك الذكاء» وأضف مفتاحك، أو بدّل إلى «الخادم المحلي» لتشغيل نموذج GGUF على جهازك.",
          });
          send("done", {});
          close();
          return;
        }

        // لقطة سريعة لتغذية موجّه النظام
        let snapshot = "";
        try {
          const ov = await executeTool("get_overview", {});
          snapshot = JSON.stringify(ov.result);
        } catch {
          /* ignore */
        }

        const messages: Msg[] = [
          { role: "system", content: buildSystemPrompt({ jsonProtocol, snapshot }) },
          ...history.slice(-14).map((m) => ({ role: m.role, content: m.content })),
        ];

        // حفظ رسالة المستخدم
        if (userText) {
          db.insert(chatMessages)
            .values({ role: "user", content: userText })
            .catch(() => {});
        }

        let finalText = "";
        const MAX_ROUNDS = 6;

        for (let round = 0; round < MAX_ROUNDS; round++) {
          const payload: Record<string, unknown> = {
            model,
            messages,
            temperature: jsonProtocol ? 0.25 : 0.4,
            stream: !jsonProtocol,
          };
          if (!jsonProtocol) {
            payload.tools = TOOL_DEFS;
            payload.tool_choice = "auto";
          }

          const upstream = await fetch(`${baseUrl}/chat/completions`, {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify(payload),
            signal: AbortSignal.timeout(150000),
          });

          if (!upstream.ok) {
            const errText = await upstream.text().catch(() => "");
            const hint = jsonProtocol
              ? "تأكد أن خادم llama.cpp يعمل (الإعدادات › الخادم المحلي › تشغيل)."
              : "تحقق من المفتاح والنموذج والرصيد لدى المزوّد.";
            send("error", { message: `فشل الاتصال بالنموذج (${upstream.status}). ${hint}` });
            send("done", {});
            close();
            return;
          }

          if (jsonProtocol) {
            // وضع غير متدفق + بروتوكول JSON — مناسب للنماذج المحلية الصغيرة
            const data = (await upstream.json()) as {
              choices?: { message?: { content?: string } }[];
            };
            const full = data.choices?.[0]?.message?.content ?? "";
            const { clean, actions } = parseActions(full);
            if (clean) send("token", { text: (finalText ? "\n" : "") + clean });
            finalText += (finalText ? "\n" : "") + clean;

            if (actions.length === 0) break;

            messages.push({ role: "assistant", content: full });
            const results: string[] = [];
            const sideActions: SideAction[] = [];
            for (const a of actions) {
              const tid = `j${round}_${results.length}`;
              send("tool", { id: tid, name: a.name, status: "start" });
              try {
                const r = await executeTool(a.name, a.args);
                results.push(`${a.name}: ${JSON.stringify(r.result).slice(0, 800)}`);
                if (r.actions) sideActions.push(...r.actions);
                send("tool", { id: tid, name: a.name, status: "end" });
              } catch (e) {
                results.push(`${a.name}: خطأ — ${e instanceof Error ? e.message : "فشل"}`);
                send("tool", { id: tid, name: a.name, status: "end" });
              }
            }
            if (sideActions.length) send("actions", { actions: sideActions });
            messages.push({
              role: "user",
              content: `نتائج الأدوات:\n${results.join("\n")}\n\nأجب المستخدم الآن بعربية موجزة، أو نفّذ أداة أخرى عند الحاجة.`,
            });
            continue;
          }

          // وضع متدفق مع أدوات OpenAI الأصلية
          const reader = upstream.body!.getReader();
          const decoder = new TextDecoder();
          let buf = "";
          let content = "";
          const toolAcc = new Map<number, ToolCall>();
          let streamErr: string | null = null;

          for (;;) {
            const { done, value } = await reader.read();
            if (done) break;
            buf += decoder.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              const t = line.trim();
              if (!t.startsWith("data:")) continue;
              const data = t.slice(5).trim();
              if (data === "[DONE]") break;
              try {
                const chunk = JSON.parse(data) as {
                  choices?: {
                    delta?: {
                      content?: string;
                      tool_calls?: {
                        index?: number;
                        id?: string;
                        function?: { name?: string; arguments?: string };
                      }[];
                    };
                  }[];
                };
                const delta = chunk.choices?.[0]?.delta;
                if (delta?.content) {
                  content += delta.content;
                  send("token", { text: delta.content });
                }
                for (const tc of delta?.tool_calls ?? []) {
                  const idx = tc.index ?? 0;
                  const cur =
                    toolAcc.get(idx) ??
                    ({ id: "", type: "function", function: { name: "", arguments: "" } } as ToolCall);
                  if (tc.id) cur.id = tc.id;
                  if (tc.function?.name) cur.function.name += tc.function.name;
                  if (tc.function?.arguments) cur.function.arguments += tc.function.arguments;
                  toolAcc.set(idx, cur);
                }
              } catch {
                /* chunk parse */
              }
            }
          }
          if (streamErr) throw new Error(streamErr);

          const calls = [...toolAcc.values()].filter((c) => c.function.name);
          if (calls.length === 0) {
            const { clean } = parseActions(content);
            finalText = clean || content;
            break;
          }

          messages.push({ role: "assistant", content: content || null, tool_calls: calls });
          for (const call of calls) {
            const name = call.function.name;
            let args: Record<string, unknown> = {};
            try {
              args = JSON.parse(call.function.arguments || "{}");
            } catch {
              /* empty */
            }
            send("tool", { id: call.id, name, status: "start" });
            let result: unknown;
            const sideActions: SideAction[] = [];
            try {
              const r = await executeTool(name, args);
              result = r.result;
              if (r.actions) sideActions.push(...r.actions);
            } catch (e) {
              result = { خطأ: e instanceof Error ? e.message : "فشل التنفيذ" };
            }
            send("tool", { id: call.id, name, status: "end" });
            if (sideActions.length) send("actions", { actions: sideActions });
            messages.push({
              role: "tool",
              tool_call_id: call.id || name,
              content: JSON.stringify(result),
            });
          }
        }

        if (finalText) {
          db.insert(chatMessages)
            .values({ role: "assistant", content: finalText })
            .catch(() => {});
        }
        send("done", {});
        close();
      } catch (e) {
        send("error", {
          message: e instanceof Error ? e.message : "حدث خطأ غير متوقع في الوكيل",
        });
        send("done", {});
        close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
      "X-Accel-Buffering": "no",
    },
  });
}
