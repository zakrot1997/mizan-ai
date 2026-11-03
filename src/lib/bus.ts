"use client";

/**
 * ناقل أحداث داخلي يربط الوكيل الذكي بواجهة التطبيق:
 * - التنقل بين الأقسام
 * - فتح روابط في المتصفح المدمج
 * - إشعارات (toast)
 */

type Handler = (payload: unknown) => void;

const listeners = new Map<string, Set<Handler>>();

export function on(event: string, handler: Handler) {
  if (typeof window === "undefined") return () => {};
  if (!listeners.has(event)) listeners.set(event, new Set());
  listeners.get(event)!.add(handler);
  return () => listeners.get(event)?.delete(handler);
}

export function emit(event: string, payload?: unknown) {
  listeners.get(event)?.forEach((h) => {
    try {
      h(payload);
    } catch {
      /* ignore */
    }
  });
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(`mizan:${event}`, { detail: payload }));
  }
}

export function navigate(view: string) {
  emit("navigate", { view });
}

export function browserOpen(url: string) {
  emit("browser.open", { url });
}

export function toast(message: string, tone: "ok" | "err" | "info" = "info") {
  emit("toast", { message, tone, id: Date.now() + Math.random() });
}
