"use client";

/**
 * محرك الاستدلال داخل المتصفح — يشغّل نموذج GGUF (مثل LFM3-1.7B-Q5_K_M)
 * مباشرة عبر WebAssembly باستخدام wllama، دون أي خادم.
 */

type WllamaInstance = {
  loadModelFromFile: (
    file: File,
    options: { n_ctx?: number; n_threads?: number; progressCallback?: (p: { loaded: number; total: number }) => void }
  ) => Promise<void>;
  loadModelFromUrl: (
    url: string,
    options: { n_ctx?: number; progressCallback?: (p: { loaded: number; total: number }) => void }
  ) => Promise<void>;
  createChatCompletion: (
    messages: { role: string; content: string }[],
    options: {
      nPredict?: number;
      sampling?: { temp?: number; top_p?: number };
      onNewToken?: (token: number, piece: Uint8Array, text: string, opts: unknown) => void;
    }
  ) => Promise<string>;
  exit: () => Promise<void>;
  isModelLoaded: () => boolean;
  getTokenEncoder?: () => unknown;
};

type WllamaCtor = new (
  config: Record<string, string>,
  options?: Record<string, unknown>
) => WllamaInstance;

const CDN_VERSION = "2.3.7";
const CDN = `https://cdn.jsdelivr.net/npm/@wllama/wllama@${CDN_VERSION}`;

// استيراد ديناميكي من CDN حتى لا يُجمَّع مع الحزمة (يحمّل wasm عند الحاجة فقط)
async function importCdn<T>(url: string): Promise<T> {
  const fn = new Function("u", "return import(u)") as (u: string) => Promise<T>;
  return fn(url);
}

let instance: WllamaInstance | null = null;
let loading = false;

export type EngineState = {
  loaded: boolean;
  loading: boolean;
  fileName: string | null;
};

export function getEngineState(): EngineState {
  return { loaded: Boolean(instance), loading, fileName: instance ? loadedName : null };
}

let loadedName: string | null = null;

export async function loadModel(
  file: File,
  onProgress: (pct: number) => void
): Promise<{ ok: boolean; error?: string }> {
  if (loading) return { ok: false, error: "التحميل جارٍ بالفعل" };
  loading = true;
  try {
    if (instance) {
      await unloadModel();
    }
    const mod = (await importCdn<{ Wllama: WllamaCtor }>(`${CDN}/esm/index.js`)) as {
      Wllama: WllamaCtor;
    };
    const cfg = {
      "single-thread/wllama.wasm": `${CDN}/esm/single-thread/wllama.wasm`,
      "multi-thread/wllama.wasm": `${CDN}/esm/multi-thread/wllama.wasm`,
    };
    let wl: WllamaInstance | null = null;
    try {
      wl = new mod.Wllama(cfg, { parallelDownloads: 3, allowOffline: false });
      await wl.loadModelFromFile(file, {
        n_ctx: 4096,
        n_threads: typeof SharedArrayBuffer !== "undefined" && crossOriginIsolated ? 4 : 1,
        progressCallback: (p) => onProgress(p.total ? Math.round((p.loaded / p.total) * 100) : 0),
      });
    } catch (e) {
      throw e;
    }
    instance = wl;
    loadedName = file.name;
    loading = false;
    return { ok: true };
  } catch (e) {
    loading = false;
    return {
      ok: false,
      error: e instanceof Error ? e.message : "فشل تحميل النموذج داخل المتصفح",
    };
  }
}

export async function unloadModel() {
  if (instance) {
    try {
      await instance.exit();
    } catch {
      /* ignore */
    }
  }
  instance = null;
  loadedName = null;
}

export async function chatStream(
  messages: { role: string; content: string }[],
  onToken: (text: string) => void
): Promise<string> {
  if (!instance) throw new Error("النموذج غير محمّل — حمّل ملف GGUF من الإعدادات أولاً");
  let acc = "";
  const decoder = new TextDecoder();
  try {
    const final = await instance.createChatCompletion(messages, {
      nPredict: 1024,
      sampling: { temp: 0.3, top_p: 0.9 },
      onNewToken: (_t, piece) => {
        const text = decoder.decode(piece, { stream: true });
        if (text) {
          acc += text;
          onToken(text);
        }
      },
    });
    return final || acc;
  } catch (e) {
    if (acc) return acc;
    throw e;
  }
}
