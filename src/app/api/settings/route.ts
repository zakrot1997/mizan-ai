import { db } from "@/db";
import { settings } from "@/db/schema";
import { eq } from "drizzle-orm";

export const dynamic = "force-dynamic";

export type AiSettings = {
  engine: "cloud" | "local_server" | "in_browser";
  cloud: { baseUrl: string; model: string; apiKey?: string };
  server: { url: string; model: string; port: number; threads: number; ctx: number; modelFile: string };
  business: { name: string; currency: string };
};

export const DEFAULT_SETTINGS: AiSettings = {
  engine: "cloud",
  cloud: { baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini", apiKey: "" },
  server: {
    url: "http://127.0.0.1:8080/v1",
    model: "local",
    port: 8080,
    threads: 4,
    ctx: 4096,
    modelFile: "LFM3-1.7B-Q5_K_M.gguf",
  },
  business: { name: "شركتي", currency: "ر.س" },
};

const KEY = "ai";

export async function loadAiSettings(): Promise<AiSettings> {
  try {
    const rows = await db.select().from(settings).where(eq(settings.key, KEY));
    const stored = (rows[0]?.value ?? {}) as Partial<AiSettings>;
    return {
      engine: stored.engine ?? DEFAULT_SETTINGS.engine,
      cloud: { ...DEFAULT_SETTINGS.cloud, ...(stored.cloud ?? {}) },
      server: { ...DEFAULT_SETTINGS.server, ...(stored.server ?? {}) },
      business: { ...DEFAULT_SETTINGS.business, ...(stored.business ?? {}) },
    };
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function GET() {
  const s = await loadAiSettings();
  const key = s.cloud.apiKey || "";
  return Response.json({
    ...s,
    cloud: {
      baseUrl: s.cloud.baseUrl,
      model: s.cloud.model,
      hasKey: Boolean(key),
      maskedKey: key ? `${key.slice(0, 7)}••••••${key.slice(-4)}` : "",
    },
  });
}

export async function PUT(req: Request) {
  try {
    const body = (await req.json()) as Partial<AiSettings> & { cloud?: { apiKey?: string } };
    const current = await loadAiSettings();
    const next: AiSettings = {
      engine: body.engine ?? current.engine,
      cloud: {
        baseUrl: body.cloud?.baseUrl ?? current.cloud.baseUrl,
        model: body.cloud?.model ?? current.cloud.model,
        apiKey:
          body.cloud && "apiKey" in body.cloud
            ? String(body.cloud.apiKey ?? "")
            : current.cloud.apiKey,
      },
      server: { ...current.server, ...(body.server ?? {}) },
      business: { ...current.business, ...(body.business ?? {}) },
    };
    const rows = await db.select().from(settings).where(eq(settings.key, KEY));
    if (rows.length) {
      await db.update(settings).set({ value: next }).where(eq(settings.key, KEY));
    } else {
      await db.insert(settings).values({ key: KEY, value: next });
    }
    return Response.json({ ok: true });
  } catch (e) {
    return Response.json({ error: e instanceof Error ? e.message : "خطأ" }, { status: 500 });
  }
}
