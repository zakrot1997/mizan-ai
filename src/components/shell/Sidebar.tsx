"use client";

import {
  LayoutDashboard,
  FolderKanban,
  SquareKanban,
  Wallet,
  Users,
  Globe,
  StickyNote,
  Settings,
  Sparkles,
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Engine } from "@/lib/engine";

export const VIEWS = [
  { id: "dashboard", label: "القيادة", icon: LayoutDashboard },
  { id: "projects", label: "المشاريع", icon: FolderKanban },
  { id: "board", label: "المهام", icon: SquareKanban },
  { id: "finance", label: "المالية", icon: Wallet },
  { id: "clients", label: "العملاء", icon: Users },
  { id: "browser", label: "المتصفح", icon: Globe },
  { id: "notes", label: "الملاحظات", icon: StickyNote },
  { id: "settings", label: "الإعدادات", icon: Settings },
] as const;

export type ViewId = (typeof VIEWS)[number]["id"];

const ENGINE_COLOR: Record<Engine, string> = {
  cloud: "#38bdf8",
  local_server: "#34d399",
  in_browser: "#a78bfa",
};
const ENGINE_LABEL: Record<Engine, string> = {
  cloud: "سحابي",
  local_server: "خادم محلي",
  in_browser: "داخل المتصفح",
};

export default function Sidebar({
  view,
  onChange,
  copilotOpen,
  onToggleCopilot,
  engine,
}: {
  view: string;
  onChange: (v: ViewId) => void;
  copilotOpen: boolean;
  onToggleCopilot: () => void;
  engine: Engine;
}) {
  return (
    <nav className="z-30 flex w-[74px] shrink-0 flex-col items-center gap-1 border-e border-white/6 bg-[#0b0f19]/80 py-3 backdrop-blur-xl">
      {VIEWS.map((v) => {
        const active = view === v.id;
        const Icon = v.icon;
        return (
          <button
            key={v.id}
            onClick={() => onChange(v.id)}
            className={cn(
              "group relative flex h-[52px] w-[60px] flex-col items-center justify-center gap-1 rounded-2xl text-slate-500 transition-all duration-200 hover:text-slate-200",
              active && "text-white"
            )}
          >
            {active && (
              <motion.span
                layoutId="nav-pill"
                className="absolute inset-0 rounded-2xl border border-cyan-400/25 bg-gradient-to-b from-cyan-400/15 to-violet-500/10"
                transition={{ type: "spring", stiffness: 420, damping: 34 }}
              />
            )}
            <Icon size={19} className={cn("relative transition-transform group-hover:scale-110", active && "text-cyan-300")} />
            <span className="relative text-[9.5px] font-semibold">{v.label}</span>
          </button>
        );
      })}

      <div className="mt-auto flex flex-col items-center gap-2">
        <div
          className="flex items-center gap-1.5 rounded-full border border-white/8 bg-white/5 px-2.5 py-1"
          title={`محرك الذكاء: ${ENGINE_LABEL[engine]}`}
        >
          <span className="h-1.5 w-1.5 rounded-full animate-pulse" style={{ background: ENGINE_COLOR[engine] }} />
          <span className="text-[9px] font-bold" style={{ color: ENGINE_COLOR[engine] }}>
            {ENGINE_LABEL[engine]}
          </span>
        </div>
        <button
          onClick={onToggleCopilot}
          className={cn(
            "relative flex h-[52px] w-[60px] flex-col items-center justify-center gap-1 rounded-2xl transition-all duration-200",
            copilotOpen
              ? "bg-gradient-to-b from-violet-500/25 to-cyan-400/15 text-violet-300 border border-violet-400/30"
              : "text-slate-500 hover:text-slate-200"
          )}
          title="وكيل ميزان (Ctrl+J)"
        >
          <Sparkles size={19} className={copilotOpen ? "animate-pulse" : ""} />
          <span className="text-[9.5px] font-semibold">الوكيل</span>
        </button>
      </div>
    </nav>
  );
}
