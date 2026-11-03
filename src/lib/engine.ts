export type Engine = "cloud" | "local_server" | "in_browser";

export const ENGINE_META: Record<Engine, { label: string; desc: string; color: string }> = {
  cloud: { label: "سحابي", desc: "مفاتيح API — OpenAI / OpenRouter / Groq…", color: "#38bdf8" },
  local_server: { label: "خادم محلي", desc: "llama.cpp على جهازك — LFM3 GGUF", color: "#34d399" },
  in_browser: { label: "داخل المتصفح", desc: "wllama WebAssembly — بلا خادم", color: "#a78bfa" },
};
