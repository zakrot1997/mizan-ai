"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpLeft,
  FileText,
  FolderKanban,
  Globe,
  LayoutDashboard,
  Plus,
  Settings,
  Sparkles,
  SquareKanban,
  StickyNote,
  Users,
  Wallet,
} from "lucide-react";
import { navigate, emit } from "@/lib/bus";

export type PaletteAction = {
  id: string;
  label: string;
  hint?: string;
  icon: React.ComponentType<{ size?: number | string; className?: string }>;
  run: () => void;
};

export default function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [q, setQ] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const actions: PaletteAction[] = useMemo(
    () => [
      { id: "v-dash", label: "لوحة القيادة", icon: LayoutDashboard, run: () => navigate("dashboard") },
      { id: "v-proj", label: "المشاريع", icon: FolderKanban, run: () => navigate("projects") },
      { id: "v-board", label: "لوحة المهام", icon: SquareKanban, run: () => navigate("board") },
      { id: "v-fin", label: "المالية", icon: Wallet, run: () => navigate("finance") },
      { id: "v-clients", label: "العملاء", icon: Users, run: () => navigate("clients") },
      { id: "v-browser", label: "المتصفح المدمج", icon: Globe, run: () => navigate("browser") },
      { id: "v-notes", label: "الملاحظات والتقارير", icon: StickyNote, run: () => navigate("notes") },
      { id: "v-settings", label: "الإعدادات", icon: Settings, run: () => navigate("settings") },
      {
        id: "a-task",
        label: "مهمة جديدة",
        hint: "إضافة مهمة سريعة عبر الوكيل",
        icon: Plus,
        run: () => { navigate("dashboard"); emit("copilot.prompt", "أضف مهمة: "); },
      },
      {
        id: "a-income",
        label: "تسجيل إيراد",
        icon: ArrowUpLeft,
        run: () => { navigate("finance"); emit("modal.open", "tx-income"); },
      },
      {
        id: "a-expense",
        label: "تسجيل مصروف",
        icon: ArrowDownLeft,
        run: () => { navigate("finance"); emit("modal.open", "tx-expense"); },
      },
      {
        id: "a-report",
        label: "توليد تقرير أسبوعي",
        hint: "الوكيل يجمع البيانات ويحفظ التقرير",
        icon: FileText,
        run: () => { emit("copilot.prompt", "أنشئ تقريراً أسبوعياً شاملاً عن حالة الأعمال واحفظه في الملاحظات"); },
      },
      {
        id: "a-brief",
        label: "موجز ذكي لليوم",
        icon: Sparkles,
        run: () => { emit("copilot.prompt", "أعطني موجزاً تنفيذياً سريعاً عن وضع أعمالي الآن مع أهم 3 توصيات"); },
      },
    ],
    []
  );

  const filtered = actions.filter((a) => a.label.includes(q.trim()) || a.hint?.includes(q.trim()));

  useEffect(() => {
    if (open) {
      setQ("");
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[95] flex items-start justify-center bg-black/60 pt-[14vh] backdrop-blur-sm"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="glass-strong w-full max-w-xl overflow-hidden rounded-2xl shadow-2xl"
            initial={{ y: -16, scale: 0.98, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: -10, opacity: 0 }}
            transition={{ type: "spring", stiffness: 400, damping: 32 }}
            onClick={(e) => e.stopPropagation()}
          >
            <input
              ref={inputRef}
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="اكتب أمراً أو ابحث عن قسم…"
              className="w-full border-b border-white/8 bg-transparent px-5 py-4 text-sm text-white outline-none placeholder:text-slate-500"
              onKeyDown={(e) => {
                if (e.key === "Enter" && filtered[0]) {
                  filtered[0].run();
                  onClose();
                }
              }}
            />
            <div className="max-h-[46vh] overflow-y-auto p-2">
              {filtered.map((a) => (
                <button
                  key={a.id}
                  onClick={() => {
                    a.run();
                    onClose();
                  }}
                  className="flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-right text-sm text-slate-300 transition-colors hover:bg-white/8 hover:text-white"
                >
                  <span className="grid h-8 w-8 place-items-center rounded-lg bg-white/6 text-cyan-300">
                    <a.icon size={16} />
                  </span>
                  <span className="font-semibold">{a.label}</span>
                  {a.hint && <span className="me-auto text-[11px] text-slate-500">{a.hint}</span>}
                </button>
              ))}
              {filtered.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-slate-500">لا نتائج — جرّب كلمة أخرى</p>
              )}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
