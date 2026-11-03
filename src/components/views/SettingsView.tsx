"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import {
  BrainCircuit,
  CheckCircle2,
  Cloud,
  Cpu,
  Database,
  ExternalLink,
  FileBox,
  HardDrive,
  Loader2,
  Play,
  RefreshCw,
  Save,
  Server,
  Sparkles,
  Square,
  TestTube2,
  XCircle,
} from "lucide-react";
import { api, invalidate, useApi } from "@/lib/api";
import { toast } from "@/lib/bus";
import { Badge, Btn, Field, GlassCard } from "@/components/ui";
import { cn, fmtNum } from "@/lib/utils";
import { ENGINE_META, type Engine } from "@/lib/engine";
import { getEngineState, loadModel, unloadModel } from "@/lib/agent/wllama-engine";

type SettingsResp = {
  engine: Engine;
  cloud: { baseUrl: string; model: string; hasKey: boolean; maskedKey: string };
  server: { url: string; model: string; port: number; threads: number; ctx: number; modelFile: string };
  business: { name: string; currency: string };
};

type LocalStatus = {
  installed: boolean;
  binary: string | null;
  models: { file: string; sizeMB: number }[];
  running: boolean;
  healthy: boolean;
  managed: boolean;
  log: string[];
};

const CLOUD_PRESETS = [
  { label: "OpenAI", baseUrl: "https://api.openai.com/v1", model: "gpt-4o-mini" },
  { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", model: "meta-llama/llama-3.3-70b-instruct" },
  { label: "Groq", baseUrl: "https://api.groq.com/openai/v1", model: "llama-3.3-70b-versatile" },
  { label: "Google Gemini", baseUrl: "https://generativelanguage.googleapis.com/v1beta/openai/", model: "gemini-2.0-flash" },
];

export default function SettingsView({ engine, onEngine }: { engine: Engine; onEngine: (e: Engine) => void }) {
  const { data, isLoading } = useApi<SettingsResp>("/api/settings");
  const [cloud, setCloud] = useState({ baseUrl: "", model: "", apiKey: "" });
  const [server, setServer] = useState<SettingsResp["server"] | null>(null);
  const [biz, setBiz] = useState({ name: "", currency: "" });
  const [testing, setTesting] = useState<"idle" | "run" | "ok" | "fail">("idle");

  useEffect(() => {
    if (data) {
      setCloud({ baseUrl: data.cloud.baseUrl, model: data.cloud.model, apiKey: "" });
      setServer(data.server);
      setBiz(data.business);
    }
  }, [data]);

  const save = async (partial: Record<string, unknown>, label = "حُفظت الإعدادات") => {
    try {
      await api.get("/api/settings").catch(() => null);
      await fetch("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(partial),
      });
      invalidate(["/api/settings"]);
      toast(label, "ok");
    } catch {
      toast("فشل الحفظ", "err");
    }
  };

  if (isLoading || !data || !server) return (
    <div className="flex h-64 items-center justify-center text-slate-500"><Loader2 className="animate-spin" /></div>
  );

  return (
    <div className="mx-auto max-w-4xl space-y-5 p-6 pb-16">
      <h1 className="text-xl font-black text-white">الإعدادات</h1>

      {/* محرك الذكاء */}
      <GlassCard>
        <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-white"><BrainCircuit size={15} className="text-violet-300" /> محرك الذكاء الاصطناعي</h2>
        <p className="mb-4 text-xs text-slate-500">ثلاثة طرق لتشغيل وكيل ميزان — بدّل بينها في أي وقت</p>
        <div className="grid gap-3 sm:grid-cols-3">
          {(Object.keys(ENGINE_META) as Engine[]).map((e) => {
            const m = ENGINE_META[e];
            const Icon = e === "cloud" ? Cloud : e === "local_server" ? Server : Cpu;
            const active = engine === e;
            return (
              <button
                key={e}
                onClick={async () => {
                  onEngine(e);
                  await save({ engine: e }, `المحرك النشط: ${m.label}`);
                }}
                className={cn(
                  "rounded-2xl border p-4 text-start transition-all",
                  active ? "border-transparent bg-gradient-to-b from-white/10 to-white/4 shadow-lg" : "border-white/8 bg-white/[.02] hover:bg-white/5"
                )}
                style={active ? { boxShadow: `0 0 40px -12px ${m.color}66`, borderColor: `${m.color}55` } : undefined}
              >
                <div className="flex items-center gap-2">
                  <Icon size={17} style={{ color: m.color }} />
                  <span className="text-sm font-extrabold text-white">{m.label}</span>
                  {active && <CheckCircle2 size={14} style={{ color: m.color }} className="ms-auto" />}
                </div>
                <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{m.desc}</p>
              </button>
            );
          })}
        </div>
      </GlassCard>

      {/* السحابة */}
      <GlassCard>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white"><Cloud size={15} className="text-sky-300" /> مزود سحابي (مفاتيح API)</h2>
        <div className="mb-3 flex flex-wrap gap-2">
          {CLOUD_PRESETS.map((p) => (
            <button
              key={p.label}
              onClick={() => setCloud((c) => ({ ...c, baseUrl: p.baseUrl, model: p.model }))}
              className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[11px] font-bold text-slate-300 transition-colors hover:border-sky-400/40 hover:text-white"
            >
              {p.label}
            </button>
          ))}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="عنوان API (متوافق مع OpenAI)">
            <input dir="ltr" className="inp text-xs" value={cloud.baseUrl} onChange={(e) => setCloud({ ...cloud, baseUrl: e.target.value })} />
          </Field>
          <Field label="النموذج">
            <input dir="ltr" className="inp text-xs" value={cloud.model} onChange={(e) => setCloud({ ...cloud, model: e.target.value })} />
          </Field>
        </div>
        <div className="mt-3">
          <Field label={`مفتاح API ${data.cloud.hasKey ? `(الحالي: ${data.cloud.maskedKey}) — اتركه فارغاً للإبقاء عليه` : ""}`}>
            <input dir="ltr" type="password" className="inp text-xs" placeholder="sk-…" value={cloud.apiKey} onChange={(e) => setCloud({ ...cloud, apiKey: e.target.value })} />
          </Field>
        </div>
        <p className="mt-2 text-[10.5px] leading-relaxed text-slate-600">
          يُخزَّن المفتاح في قاعدة بياناتك على الخادم فقط ولا يُرسَل للمتصفح بعد حفظه.
        </p>
        <div className="mt-4 flex items-center gap-2">
          <Btn onClick={() => save({ cloud: { baseUrl: cloud.baseUrl, model: cloud.model, apiKey: cloud.apiKey } })}>
            <Save size={14} /> حفظ
          </Btn>
          <Btn
            variant="soft"
            disabled={testing === "run"}
            onClick={async () => {
              setTesting("run");
              try {
                await save({ cloud: { baseUrl: cloud.baseUrl, model: cloud.model, apiKey: cloud.apiKey } }, "حُفظ");
                const res = await fetch("/api/chat", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ mode: "cloud", messages: [{ role: "user", content: "رد بكلمة واحدة: جاهز" }] }),
                });
                const text = await res.text();
                setTesting(text.includes("event: error") ? "fail" : "ok");
                setTimeout(() => setTesting("idle"), 4000);
              } catch {
                setTesting("fail");
                setTimeout(() => setTesting("idle"), 4000);
              }
            }}
          >
            {testing === "run" ? <Loader2 size={14} className="animate-spin" /> : <TestTube2 size={14} />}
            اختبار الاتصال
          </Btn>
          {testing === "ok" && <Badge color="#34d399">المزود يستجيب ✓</Badge>}
          {testing === "fail" && <Badge color="#f87171">فشل الاتصال — راجع المفتاح</Badge>}
        </div>
      </GlassCard>

      {/* الخادم المحلي llama.cpp */}
      <LocalServerPanel server={server} setServer={setServer} onSave={() => save({ server })} />

      {/* داخل المتصفح wllama */}
      <InBrowserPanel />

      {/* بيانات العمل */}
      <GlassCard>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold text-white"><Database size={15} className="text-amber-300" /> بيانات العمل</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="اسم المنشأة">
            <input className="inp text-xs" value={biz.name} onChange={(e) => setBiz({ ...biz, name: e.target.value })} />
          </Field>
          <Field label="العملة">
            <input className="inp text-xs" value={biz.currency} onChange={(e) => setBiz({ ...biz, currency: e.target.value })} />
          </Field>
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Btn variant="soft" onClick={() => save({ business: biz })}><Save size={14} /> حفظ</Btn>
          <Btn
            variant="ghost"
            onClick={async () => {
              const r = await api.post<{ ok: boolean; skipped?: boolean }>("/api/seed", {});
              if (r.skipped) toast("توجد بيانات مسبقاً — التعبئة مرة واحدة", "info");
              else {
                invalidate(["/api/"]);
                toast("عُبّئت بيانات تجريبية واقعية", "ok");
              }
            }}
          >
            <Sparkles size={14} /> تعبئة بيانات تجريبية
          </Btn>
        </div>
      </GlassCard>

      {/* حول */}
      <GlassCard className="flex flex-wrap items-center gap-3">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/logo.png" alt="" className="h-10 w-10 rounded-xl" />
        <div>
          <p className="text-sm font-extrabold text-white">ميزان AI — مكتب الأعمال الذكي</p>
          <p className="text-[11px] text-slate-500">مشاريع · مهام · مالية · عملاء · وكيل يتحكم بمتصفح مدمج — كل ذلك في نافذة واحدة</p>
        </div>
        <a
          href="https://github.com/zakrot1997/mizan-ai"
          target="_blank"
          rel="noreferrer"
          className="ms-auto flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs font-bold text-slate-300 transition-colors hover:border-white/30 hover:text-white"
        >
          <ExternalLink size={14} /> المستودع
        </a>
      </GlassCard>
    </div>
  );
}

/* ───────── لوحة الخادم المحلي ───────── */
function LocalServerPanel({
  server,
  setServer,
  onSave,
}: {
  server: NonNullable<SettingsResp["server"]>;
  setServer: (s: NonNullable<SettingsResp["server"]>) => void;
  onSave: () => void;
}) {
  const [st, setSt] = useState<LocalStatus | null>(null);
  const [busy, setBusy] = useState(false);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const refresh = useCallback(async () => {
    try {
      const r = await api.get<LocalStatus>("/api/local-ai");
      setSt(r);
      return r;
    } catch {
      return null;
    }
  }, []);

  useEffect(() => {
    refresh();
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [refresh]);

  const start = async () => {
    setBusy(true);
    await onSave();
    const r = await api.post<{ ok: boolean; message?: string; state?: string }>("/api/local-ai", {
      action: "start",
      modelFile: server.modelFile,
      port: server.port,
      threads: server.threads,
      ctx: server.ctx,
    }).catch(() => null);
    if (!r?.ok) {
      toast(r?.message ?? "تعذر التشغيل", "err");
      setBusy(false);
      return;
    }
    toast("جارٍ تحميل النموذج في الذاكرة… (قد يستغرق 10-30 ثانية)", "info");
    pollRef.current = setInterval(async () => {
      const s = await refresh();
      if (s?.healthy) {
        if (pollRef.current) clearInterval(pollRef.current);
        setBusy(false);
        toast("الخادم المحلي جاهز — النموذج يستجيب", "ok");
      }
    }, 2500);
    setTimeout(() => {
      if (pollRef.current) clearInterval(pollRef.current);
      setBusy(false);
    }, 90000);
  };

  const stop = async () => {
    await api.post("/api/local-ai", { action: "stop" });
    setBusy(false);
    refresh();
    toast("أُوقف الخادم", "info");
  };

  return (
    <GlassCard glow="rgba(52,211,153,.12)">
      <div className="mb-1 flex items-center gap-2">
        <Server size={15} className="text-emerald-300" />
        <h2 className="text-sm font-bold text-white">الخادم المحلي — llama.cpp (موصى به لجهازك)</h2>
        <div className="ms-auto flex items-center gap-2">
          {st?.healthy ? (
            <Badge color="#34d399"><span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-400" /> يعمل وجاهز</Badge>
          ) : st?.managed ? (
            <Badge color="#fbbf24">يُحمّل…</Badge>
          ) : (
            <Badge color="#64748b">متوقف</Badge>
          )}
          {!st?.installed && <Badge color="#f87171">المشغّل غير مثبّت</Badge>}
        </div>
      </div>
      <p className="mb-4 text-xs leading-relaxed text-slate-500">
        يشغّل نموذج <span dir="ltr" className="font-bold text-emerald-300/90">LFM3-1.7B-Q5_K_M.gguf</span> على جهازك (i7-3770 / 12GB) عبر خادم llama.cpp
        — نحو 6–12 رمزاً/ثانية على المعالج. شغّل سكربت الإعداد مرة واحدة ثم أدر كل شيء من هنا.
      </p>

      {!st?.installed && (
        <div className="mb-4 rounded-xl border border-amber-400/25 bg-amber-400/8 p-3 text-[11.5px] leading-relaxed text-amber-200">
          <p className="font-bold">الإعداد لمرة واحدة (دقيقتان):</p>
          <ol className="mt-1.5 list-decimal space-y-1 ps-4">
            <li>شغّل <code dir="ltr" className="rounded bg-black/40 px-1.5 py-0.5 text-amber-100">scripts\setup-local-ai.bat</code> (ويندوز) أو <code dir="ltr" className="rounded bg-black/40 px-1.5 py-0.5 text-amber-100">bash scripts/setup-local-ai.sh</code> (لينكس) — يحمّل llama.cpp تلقائياً إلى <code>bin/</code></li>
            <li>نزّل ملف النموذج من Hugging Face وضعه في مجلد <code dir="ltr" className="rounded bg-black/40 px-1.5 py-0.5">models/</code> باسم <code dir="ltr" className="rounded bg-black/40 px-1.5 py-0.5">LFM3-1.7B-Q5_K_M.gguf</code></li>
            <li>ارجع هنا واضغط «تشغيل المحرك»</li>
          </ol>
        </div>
      )}

      <div className="grid gap-3 sm:grid-cols-2">
        <Field label={`ملف النموذج ${st?.models?.length ? `(${st.models.length} ملف GGUF موجود)` : ""}`}>
          {st?.models?.length ? (
            <select className="inp text-xs" dir="ltr" value={server.modelFile} onChange={(e) => setServer({ ...server, modelFile: e.target.value })}>
              {st.models.map((m) => (
                <option key={m.file} value={m.file}>{m.file} — {fmtNum(m.sizeMB)}MB</option>
              ))}
            </select>
          ) : (
            <input dir="ltr" className="inp text-xs" value={server.modelFile} onChange={(e) => setServer({ ...server, modelFile: e.target.value })} />
          )}
        </Field>
        <Field label="عنوان الخادم (OpenAI متوافق)">
          <input dir="ltr" className="inp text-xs" value={server.url} onChange={(e) => setServer({ ...server, url: e.target.value })} />
        </Field>
        <Field label={`الأنصبة — threads (${server.threads})`}>
          <input type="range" min={2} max={8} value={server.threads} onChange={(e) => setServer({ ...server, threads: Number(e.target.value) })} className="w-full accent-emerald-400" />
        </Field>
        <Field label={`حجم السياق — ctx (${fmtNum(server.ctx)})`}>
          <input type="range" min={1024} max={8192} step={512} value={server.ctx} onChange={(e) => setServer({ ...server, ctx: Number(e.target.value) })} className="w-full accent-emerald-400" />
        </Field>
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        {st?.managed || st?.healthy ? (
          <Btn variant="danger" onClick={stop}><Square size={13} /> إيقاف المحرك</Btn>
        ) : (
          <Btn onClick={start} disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <Play size={14} />} تشغيل المحرك
          </Btn>
        )}
        <Btn variant="ghost" onClick={refresh}><RefreshCw size={13} /> تحديث الحالة</Btn>
        <Btn variant="soft" onClick={onSave}><Save size={13} /> حفظ التكوين</Btn>
      </div>

      {st?.log && st.log.length > 0 && (
        <pre dir="ltr" className="mt-4 max-h-36 overflow-y-auto rounded-xl bg-black/50 p-3 text-left text-[10px] leading-relaxed text-emerald-200/70">
          {st.log.slice(-12).join("\n")}
        </pre>
      )}
    </GlassCard>
  );
}

/* ───────── لوحة النموذج داخل المتصفح ───────── */
function InBrowserPanel() {
  const [pct, setPct] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loaded, setLoaded] = useState(getEngineState().loaded);
  const [name, setName] = useState<string | null>(getEngineState().fileName);
  const fileRef = useRef<HTMLInputElement>(null);

  return (
    <GlassCard glow="rgba(167,139,250,.12)">
      <h2 className="mb-1 flex items-center gap-2 text-sm font-bold text-white"><Cpu size={15} className="text-violet-300" /> النموذج داخل المتصفح — wllama (WebAssembly)</h2>
      <p className="mb-4 text-xs leading-relaxed text-slate-500">
        يحمّل ملف GGUF في ذاكرة المتصفح ويشغّله على المعالج دون أي خادم أو تثبيت — خصوصية مطلقة. أبطأ من الخادم المحلي (خيط واحد حالياً)
        لكنه يعمل في أي مكان. يُخزَّن النموذج مؤقتاً في متصفحك بعد أول تحميل.
      </p>

      {loaded ? (
        <div className="flex flex-wrap items-center gap-3">
          <Badge color="#a78bfa"><CheckCircle2 size={11} /> محمّل: {name}</Badge>
          <Btn variant="danger" onClick={async () => { await unloadModel(); setLoaded(false); setName(null); toast("أُفرغ النموذج من الذاكرة", "info"); }}>
            <XCircle size={13} /> إفراغ النموذج
          </Btn>
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-3">
          <input
            ref={fileRef}
            type="file"
            accept=".gguf"
            className="hidden"
            onChange={async (e) => {
              const f = e.target.files?.[0];
              if (!f) return;
              setBusy(true);
              setPct(0);
              const r = await loadModel(f, setPct);
              setBusy(false);
              if (r.ok) {
                setLoaded(true);
                setName(f.name);
                toast(`جاهز — ${f.name} يعمل الآن داخل متصفحك`, "ok");
              } else {
                toast(r.error ?? "فشل التحميل", "err");
              }
              e.target.value = "";
            }}
          />
          <Btn onClick={() => fileRef.current?.click()} disabled={busy}>
            {busy ? <Loader2 size={14} className="animate-spin" /> : <FileBox size={14} />}
            اختر ملف GGUF وحمّله
          </Btn>
          {busy && (
            <div className="flex min-w-48 flex-1 items-center gap-2">
              <div className="h-2 flex-1 overflow-hidden rounded-full bg-white/8">
                <motion.div className="h-full rounded-full bg-gradient-to-l from-violet-400 to-cyan-300" animate={{ width: `${pct}%` }} />
              </div>
              <span className="text-[11px] font-bold text-violet-300">{pct}٪</span>
            </div>
          )}
          <p className="w-full text-[10.5px] text-slate-600">
            الحجم الأقصى المقترح لهذا الوضع على جهازك: نماذج 1–3B بكمّية Q5/Q4 (نحو 1–2GB). RAM المتصفح: سيستهلك حجم الملف تقريباً.
          </p>
        </div>
      )}
      <div className="mt-3 flex items-center gap-2 text-[10.5px] text-slate-600">
        <HardDrive size={11} />
        بعد التحميل بدّل المحرك إلى «داخل المتصفح» من الأعلى، ثم تحدث مع الوكيل.
      </div>
    </GlassCard>
  );
}
