import { spawn, type ChildProcess } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { loadAiSettings } from "../settings/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * مدير محرك الذكاء المحلي — يشغّل/يوقف خادم llama.cpp على جهاز المستخدم
 * عند استضافة البرنامج محلياً (npm run start). يقرأ أوزان GGUF من مجلد models/.
 */

type LocalAiState = {
  proc: ChildProcess | null;
  startedAt: number | null;
  log: string[];
};

const g = globalThis as typeof globalThis & { __mizanLocalAi?: LocalAiState };
if (!g.__mizanLocalAi) g.__mizanLocalAi = { proc: null, startedAt: null, log: [] };
const state = g.__mizanLocalAi;

function pushLog(line: string) {
  state.log.push(line.trim());
  if (state.log.length > 200) state.log.splice(0, state.log.length - 200);
}

function findBinary(): string | null {
  if (process.env.LLAMA_BIN && fs.existsSync(process.env.LLAMA_BIN)) return process.env.LLAMA_BIN;
  const candidates = [
    path.join(process.cwd(), "bin", "llama-server.exe"),
    path.join(process.cwd(), "bin", "llama-server"),
    path.join(process.cwd(), "bin", "llama.cpp", "llama-server.exe"),
    path.join(process.cwd(), "bin", "llama.cpp", "llama-server"),
  ];
  return candidates.find((c) => fs.existsSync(c)) ?? null;
}

function listModels(): { file: string; sizeMB: number }[] {
  const dir = process.env.MODELS_DIR || path.join(process.cwd(), "models");
  try {
    return fs
      .readdirSync(dir)
      .filter((f) => f.toLowerCase().endsWith(".gguf"))
      .map((f) => ({ file: f, sizeMB: Math.round(fs.statSync(path.join(dir, f)).size / 1048576) }));
  } catch {
    return [];
  }
}

async function probeHealth(port: number): Promise<boolean> {
  try {
    const res = await fetch(`http://127.0.0.1:${port}/health`, {
      signal: AbortSignal.timeout(1200),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function GET() {
  const s = await loadAiSettings();
  const binary = findBinary();
  const models = listModels();
  const alive = state.proc !== null && state.proc.exitCode === null;
  const healthy = await probeHealth(s.server.port);
  return Response.json({
    installed: Boolean(binary),
    binary,
    models,
    running: alive || healthy,
    healthy,
    managed: alive,
    startedAt: state.startedAt,
    config: { port: s.server.port, threads: s.server.threads, ctx: s.server.ctx, modelFile: s.server.modelFile },
    log: state.log.slice(-40),
  });
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = String(body.action || "");
  const s = await loadAiSettings();

  if (action === "stop") {
    if (state.proc && state.proc.exitCode === null) {
      state.proc.kill("SIGTERM");
      state.proc = null;
      state.startedAt = null;
      pushLog("تم إيقاف الخادم من قبل المستخدم");
      return Response.json({ ok: true, state: "stopped" });
    }
    return Response.json({ ok: true, state: "not_running" });
  }

  if (action !== "start") {
    return Response.json({ error: "إجراء غير معروف" }, { status: 400 });
  }

  if (state.proc && state.proc.exitCode === null) {
    return Response.json({ ok: true, state: "already_running" });
  }

  const binary = findBinary();
  if (!binary) {
    return Response.json(
      {
        ok: false,
        code: "BIN_MISSING",
        message:
          "لم يتم العثور على binary لخادم llama.cpp. شغّل السكربت scripts/setup-local-ai (bat أو sh) لتحميله تلقائياً في مجلد bin/ ثم أعد المحاولة.",
      },
      { status: 400 }
    );
  }

  const modelFile = String(body.modelFile || s.server.modelFile);
  const modelsDir = process.env.MODELS_DIR || path.join(process.cwd(), "models");
  const modelPath = path.join(modelsDir, modelFile);
  if (!fs.existsSync(modelPath)) {
    return Response.json(
      {
        ok: false,
        code: "MODEL_MISSING",
        message: `لم يتم العثور على ملف النموذج "${modelFile}". ضعه داخل مجلد models/ بجوار المشروع (حمّله من Hugging Face — ابحث عن LFM3 GGUF).`,
      },
      { status: 400 }
    );
  }

  const port = Number(body.port || s.server.port) || 8080;
  const threads = Number(body.threads || s.server.threads) || 4;
  const ctx = Number(body.ctx || s.server.ctx) || 4096;

  const args = ["-m", modelPath, "--port", String(port), "--host", "127.0.0.1", "--ctx-size", String(ctx), "--threads", String(threads), "--jinja", "--log-disable"];

  try {
    const proc = spawn(binary, args, { cwd: process.cwd() });
    state.proc = proc;
    state.startedAt = Date.now();
    state.log = [];
    proc.stdout?.on("data", (d: Buffer) => pushLog(String(d)));
    proc.stderr?.on("data", (d: Buffer) => pushLog(String(d)));
    proc.on("exit", (code) => {
      pushLog(`انتهت العملية برمز ${code}`);
      state.proc = null;
      state.startedAt = null;
    });
    return Response.json({ ok: true, state: "starting", pid: proc.pid });
  } catch (e) {
    return Response.json(
      { ok: false, message: e instanceof Error ? e.message : "فشل تشغيل الخادم" },
      { status: 500 }
    );
  }
}
