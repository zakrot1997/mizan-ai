"use client";

import { Globe, Maximize2, Minus, Search, X } from "lucide-react";
import { motion } from "framer-motion";
import { IconBtn } from "@/components/ui";
import { toast } from "@/lib/bus";
import { useEffect, useState } from "react";

export default function TitleBar({ onOpenPalette }: { onOpenPalette: () => void }) {
  const [clock, setClock] = useState("");
  const [full, setFull] = useState(false);

  useEffect(() => {
    const tick = () =>
      setClock(
        new Intl.DateTimeFormat("ar-u-nu-latn-ca-gregory", {
          weekday: "long",
          hour: "2-digit",
          minute: "2-digit",
        }).format(new Date())
      );
    tick();
    const t = setInterval(tick, 15000);
    return () => clearInterval(t);
  }, []);

  const toggleFull = async () => {
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
        setFull(false);
      } else {
        await document.documentElement.requestFullscreen();
        setFull(true);
      }
    } catch {
      /* ignore */
    }
  };

  return (
    <header className="relative z-40 flex h-12 shrink-0 items-center gap-3 border-b border-white/6 bg-[#0b0f19]/90 px-4 backdrop-blur-xl">
      {/* شعار */}
      <div className="flex items-center gap-2.5">
        <div className="logo-mark">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src="/logo.png" alt="ميزان" className="h-6 w-6 rounded-md" />
        </div>
        <div className="leading-tight">
          <span className="block text-[13px] font-extrabold tracking-tight text-white">ميزان AI</span>
          <span className="hidden text-[10px] text-slate-500 sm:block">مكتب الأعمال الذكي</span>
        </div>
      </div>

      {/* شريط "العنوان" — يشبه نافذة تطبيق سطح المكتب */}
      <div className="mx-auto flex-1 max-w-xl" dir="ltr">
        <motion.button
          onClick={onOpenPalette}
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
          className="group flex h-8 w-full items-center gap-2 rounded-lg border border-white/8 bg-white/5 px-3 text-left text-xs text-slate-400 transition-colors hover:border-cyan-400/30 hover:text-slate-200"
        >
          <Search size={13} className="opacity-70" />
          <span>ابحث أو نفّذ أمراً…</span>
          <kbd className="ml-auto rounded-md border border-white/10 bg-white/5 px-1.5 py-0.5 text-[10px] text-slate-500">
            Ctrl K
          </kbd>
        </motion.button>
      </div>

      <div className="hidden items-center gap-2 text-[11px] text-slate-500 md:flex">
        <Globe size={12} className="text-cyan-400/70" />
        <span>{clock}</span>
      </div>

      {/* أزرار النافذة */}
      <div className="flex items-center gap-0.5" dir="ltr">
        <IconBtn
          title="تصغير"
          className="h-8 w-8"
          onClick={() => toast("نافذة مستقلة: ثبّتها كتطبيق على سطح المكتب من قائمة المتصفح (تثبيت التطبيق/Install)", "info")}
        >
          <Minus size={15} />
        </IconBtn>
        <IconBtn title={full ? "إنهاء ملء الشاشة" : "ملء الشاشة"} className="h-8 w-8" onClick={toggleFull}>
          <Maximize2 size={14} />
        </IconBtn>
        <IconBtn
          title="إغلاق"
          className="h-8 w-8 hover:!bg-rose-500/80 hover:!text-white"
          onClick={() => toast("للخروج أغلق التبويب — بياناتك محفوظة في قاعدة البيانات", "info")}
        >
          <X size={15} />
        </IconBtn>
      </div>
    </header>
  );
}
