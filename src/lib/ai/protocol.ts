/**
 * بروتوكول الوكيل الموحّد — يعمل مع:
 * 1) النماذج السحابية (أدوات OpenAI الأصلية)
 * 2) خادم llama.cpp المحلي (بروتوكول JSON داخل النص)
 * 3) النموذج داخل المتصفح عبر wllama (نفس البروتوكول)
 */

export type SideAction =
  | { kind: "invalidate"; keys: string[] }
  | { kind: "browser.open"; url: string }
  | { kind: "navigate"; view: string };

export type ParsedAction = { name: string; args: Record<string, unknown> };

export type AgentEvent =
  | { type: "token"; text: string }
  | { type: "tool"; id: string; name: string; status: "start" | "end"; result?: string }
  | { type: "actions"; actions: SideAction[] }
  | { type: "done" }
  | { type: "error"; message: string };

const ACTION_RE = /<action>\s*(\{[\s\S]*?\})\s*<\/action>/g;

/** استخراج أوامر <action>{...}</action> من رد النموذج وتنظيف النص المعروض */
export function parseActions(text: string): { clean: string; actions: ParsedAction[] } {
  const actions: ParsedAction[] = [];
  let clean = text.replace(ACTION_RE, (_m, json: string) => {
    try {
      const obj = JSON.parse(json);
      const name = obj.name || obj.tool;
      if (typeof name === "string") {
        const args = (obj.args || obj.arguments || {}) as Record<string, unknown>;
        actions.push({ name, args: typeof args === "object" && args ? args : {} });
      }
    } catch {
      /* تجاهل JSON التالف */
    }
    return "";
  });
  clean = clean.replace(/\n{3,}/g, "\n\n").trim();
  return { clean, actions };
}

/** أثناء البث: نُخفي أي وسوم <action> غير مكتملة عن المستخدم */
export function splitStreamSafe(buffer: string): { safe: string; rest: string } {
  const idx = buffer.indexOf("<action");
  if (idx === -1) {
    // احذر من بادئة جزئية مثل "<act" في نهاية المخزن
    const tail = buffer.slice(-7);
    const partial = tail.search(/<a?c?t?i?o?n?$/);
    if (partial !== -1 && tail.slice(partial).startsWith("<")) {
      const cut = buffer.length - (tail.length - partial);
      return { safe: buffer.slice(0, cut), rest: buffer.slice(cut) };
    }
    return { safe: buffer, rest: "" };
  }
  return { safe: buffer.slice(0, idx), rest: buffer.slice(idx) };
}
