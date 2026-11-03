"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BookOpen,
  Bookmark,
  BookmarkPlus,
  ExternalLink,
  Globe,
  Home,
  Loader2,
  RotateCw,
  Sparkles,
  X,
} from "lucide-react";
import { api } from "@/lib/api";
import { emit, on } from "@/lib/bus";
import { Btn, IconBtn } from "@/components/ui";
import { cn } from "@/lib/utils";
import type { PageRead } from "@/lib/web";

const HOME = "https://ar.wikipedia.org";
const BOOKMARKS_KEY = "mizan.bookmarks.v1";
const DEFAULT_BOOKMARKS = [
  { title: "ويكيبيديا", url: "https://ar.wikipedia.org" },
  { title: "Google", url: "https://www.google.com/search?q=%D8%A3%D8%AE%D8%A8%D8%A7%D8%B1+%D8%A7%D9%84%D8%B0%D9%83%D8%A7%D8%A1+%D8%A7%D9%84%D8%A7%D8%B5%D8%B7%D9%86%D8%A7%D8%B9%D9%8A" },
  { title: "GitHub", url: "https://github.com/trending" },
  { title: "Hacker News", url: "https://news.ycombinator.com" },
];

function normalize(input: string): string {
  const t = input.trim();
  if (!t) return HOME;
  if (/^https?:\/\//i.test(t)) return t;
  if (/^[\w-]+(\.[\w-]+)+(\/\S*)?$/.test(t)) return `https://${t}`;
  return `https://www.google.com/search?q=${encodeURIComponent(t)}`;
}

export default function BrowserView() {
  const [url, setUrl] = useState(HOME);
  const [address, setAddress] = useState(HOME);
  const [history, setHistory] = useState<string[]>([HOME]);
  const [hIndex, setHIndex] = useState(0);
  const [bookmarks, setBookmarks] = useState(DEFAULT_BOOKMARKS);
  const [reader, setReader] = useState<{ loading: boolean; page: PageRead | null; error?: string }>({ loading: false, page: null });
  const [readerOpen, setReaderOpen] = useState(false);
  const [agentPulse, setAgentPulse] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(BOOKMARKS_KEY);
      if (raw) setBookmarks(JSON.parse(raw));
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(
    () =>
      on("browser.open", (p) => {
        const u = normalize(String((p as { url?: string })?.url ?? ""));
        go(u);
        setAgentPulse(true);
        setTimeout(() => setAgentPulse(false), 6000);
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [history, hIndex]
  );

  const go = (u: string) => {
    const next = [...history.slice(0, hIndex + 1), u];
    setHistory(next);
    setHIndex(next.length - 1);
    setUrl(u);
    setAddress(u);
  };

  const back = () => {
    if (hIndex > 0) {
      const i = hIndex - 1;
      setHIndex(i);
      setUrl(history[i]);
      setAddress(history[i]);
    }
  };
  const forward = () => {
    if (hIndex < history.length - 1) {
      const i = hIndex + 1;
      setHIndex(i);
      setUrl(history[i]);
      setAddress(history[i]);
    }
  };

  const saveBookmarks = (b: typeof DEFAULT_BOOKMARKS) => {
    setBookmarks(b);
    try {
      localStorage.setItem(BOOKMARKS_KEY, JSON.stringify(b));
    } catch {
      /* ignore */
    }
  };

  const loadReader = async () => {
    setReaderOpen(true);
    setReader({ loading: true, page: null });
    try {
      const r = await api.get<{ ok: boolean; page: PageRead; error?: string }>(`/api/proxy?url=${encodeURIComponent(url)}`);
      if (!r.ok) setReader({ loading: false, page: null, error: r.error });
      else setReader({ loading: false, page: r.page });
    } catch (e) {
      setReader({ loading: false, page: null, error: e instanceof Error ? e.message : "فشل" });
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* شريط الأدوات */}
      <div className="flex items-center gap-1.5 border-b border-white/8 bg-[#0b0f19]/80 px-3 py-2 backdrop-blur">
        <IconBtn title="رجوع" onClick={back}><ArrowRight size={16} /></IconBtn>
        <IconBtn title="تقدم" onClick={forward}><ArrowLeft size={16} /></IconBtn>
        <IconBtn title="تحديث" onClick={() => setReloadKey((k) => k + 1)}><RotateCw size={14} /></IconBtn>
        <IconBtn title="الرئيسية" onClick={() => go(HOME)}><Home size={15} /></IconBtn>

        <form
          className="relative mx-1 flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            go(normalize(address));
          }}
        >
          <Globe size={13} className="pointer-events-none absolute start-3 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            onFocus={(e) => e.target.select()}
            dir="ltr"
            className={cn(
              "h-9 w-full rounded-xl border bg-white/5 ps-9 pe-28 text-[12.5px] text-slate-100 outline-none transition-colors placeholder:text-slate-600",
              agentPulse ? "border-violet-400/60 shadow-[0_0_20px_-4px_rgba(167,139,250,.5)]" : "border-white/10 focus:border-cyan-400/40"
            )}
            placeholder="اكتب رابطاً أو ابحث…"
          />
          <div className="absolute end-1.5 top-1/2 flex -translate-y-1/2 items-center gap-1">
            {agentPulse && (
              <span className="flex items-center gap-1 rounded-md bg-violet-500/20 px-1.5 py-0.5 text-[9px] font-bold text-violet-300">
                <Sparkles size={9} className="animate-pulse" /> الوكيل يقود
              </span>
            )}
            <button
              type="button"
              onClick={() => {
                if (bookmarks.some((b) => b.url === url)) return;
                const title = prompt("اسم المفضلة:", new URL(url).hostname);
                if (title) saveBookmarks([...bookmarks, { title, url }]);
              }}
              className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-white/10 hover:text-amber-300"
              title="إضافة للمفضلة"
            >
              {bookmarks.some((b) => b.url === url) ? <Bookmark size={13} className="fill-amber-400 text-amber-400" /> : <BookmarkPlus size={13} />}
            </button>
          </div>
        </form>

        <Btn variant={readerOpen ? "primary" : "soft"} className="!px-3 !py-2 text-[11px]" onClick={() => (readerOpen ? setReaderOpen(false) : loadReader())}>
          <BookOpen size={13} /> وضع القراءة
        </Btn>
        <IconBtn title="فتح خارجياً" onClick={() => window.open(url, "_blank")}><ExternalLink size={14} /></IconBtn>
      </div>

      {/* شريط المفضلة */}
      <div className="flex items-center gap-1.5 overflow-x-auto border-b border-white/6 bg-white/[.02] px-3 py-1.5">
        {bookmarks.map((b, i) => (
          <button
            key={b.url + i}
            onClick={() => go(b.url)}
            onContextMenu={(e) => {
              e.preventDefault();
              if (confirm(`إزالة «${b.title}» من المفضلة؟`)) saveBookmarks(bookmarks.filter((x) => x.url !== b.url));
            }}
            className="flex shrink-0 items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-semibold text-slate-400 transition-colors hover:bg-white/8 hover:text-white"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={`https://www.google.com/s2/favicons?domain=${new URL(b.url).hostname}&sz=16`} alt="" className="h-3.5 w-3.5 rounded-sm" />
            {b.title}
          </button>
        ))}
      </div>

      {/* منطقة العرض */}
      <div className="relative flex min-h-0 flex-1">
        <iframe
          key={`${url}-${reloadKey}`}
          ref={frameRef}
          src={url}
          title="المتصفح المدمج"
          className="h-full w-full flex-1 bg-white"
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-popups-to-escape-sandbox"
        />

        {/* لوحة القراءة */}
        <AnimatePresence>
          {readerOpen && (
            <motion.div
              initial={{ x: -420, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: -420, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 32 }}
              className="absolute inset-y-0 start-0 w-full max-w-md border-e border-white/10 bg-[#0b0f19]/97 shadow-2xl backdrop-blur-xl"
            >
              <div className="flex items-center gap-2 border-b border-white/8 px-4 py-3">
                <BookOpen size={15} className="text-cyan-300" />
                <p className="truncate text-[13px] font-bold text-white">
                  {reader.page?.title ?? "وضع القراءة"}
                </p>
                <div className="ms-auto flex items-center gap-1">
                  {reader.page && (
                    <Btn
                      variant="soft"
                      className="!px-2.5 !py-1.5 text-[11px]"
                      onClick={() => {
                        emit("copilot.prompt", `لخّص لي محتوى هذه الصفحة نقاطاً:\nالعنوان: ${reader.page!.title}\nالرابط: ${reader.page!.url}\nالمحتوى:\n${reader.page!.text.slice(0, 2500)}`);
                      }}
                    >
                      <Sparkles size={12} /> لخّصها يا ميزان
                    </Btn>
                  )}
                  <IconBtn title="إغلاق" onClick={() => setReaderOpen(false)}><X size={15} /></IconBtn>
                </div>
              </div>
              <div className="reader-scroll h-[calc(100%-53px)] overflow-y-auto px-5 py-4">
                {reader.loading && (
                  <div className="flex items-center gap-2 py-10 text-sm text-slate-400">
                    <Loader2 size={16} className="animate-spin" /> يجلب ميزان المحتوى عبر الخادم…
                  </div>
                )}
                {reader.error && <p className="py-6 text-sm text-rose-300">{reader.error}</p>}
                {reader.page && (
                  <article className="prose-dark">
                    <p className="mb-1 text-[11px] font-bold text-cyan-400" dir="ltr">{reader.page.siteName}</p>
                    <h1 className="mb-4 text-lg font-black leading-snug text-white">{reader.page.title}</h1>
                    <p className="whitespace-pre-wrap text-[13px] leading-7 text-slate-300">{reader.page.text}</p>
                  </article>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      <p className="border-t border-white/6 bg-[#0b0f19]/80 px-4 py-1.5 text-center text-[10px] text-slate-600">
        بعض المواقع تمنع التضمين داخل إطار (X-Frame-Options) — استخدم «وضع القراءة» لقراءتها عبر الخادم، أو «فتح خارجياً». الوكيل يستطيع فتح وقراءة أي صفحة عبر وضع القراءة.
      </p>
    </div>
  );
}
