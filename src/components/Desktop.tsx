"use client";

import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AlertTriangle, CheckCircle2, Info } from "lucide-react";
import TitleBar from "@/components/shell/TitleBar";
import Sidebar, { VIEWS, type ViewId } from "@/components/shell/Sidebar";
import CommandPalette from "@/components/shell/CommandPalette";
import Copilot from "@/components/shell/Copilot";
import DashboardView from "@/components/views/DashboardView";
import ProjectsView from "@/components/views/ProjectsView";
import BoardView from "@/components/views/BoardView";
import FinanceView from "@/components/views/FinanceView";
import ClientsView from "@/components/views/ClientsView";
import BrowserView from "@/components/views/BrowserView";
import NotesView from "@/components/views/NotesView";
import SettingsView from "@/components/views/SettingsView";
import { on } from "@/lib/bus";
import { useApi } from "@/lib/api";
import { cn } from "@/lib/utils";
import type { Engine } from "@/lib/engine";

type Toast = { id: number; message: string; tone: "ok" | "err" | "info" };

export default function Desktop() {
  const [view, setView] = useState<ViewId>("dashboard");
  const [copilotOpen, setCopilotOpen] = useState(true);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [engineOverride, setEngineOverride] = useState<Engine | null>(null);

  const { data: settings } = useApi<{ engine: Engine }>("/api/settings");
  const engine: Engine = engineOverride ?? settings?.engine ?? "cloud";

  useEffect(() => {
    const offs = [
      on("navigate", (p) => {
        const v = (p as { view: string }).view as ViewId;
        if (VIEWS.some((x) => x.id === v)) setView(v);
      }),
      on("toast", (p) => {
        const t = p as Toast;
        setToasts((s) => [...s.slice(-3), t]);
        setTimeout(() => setToasts((s) => s.filter((x) => x.id !== t.id)), 4200);
      }),
      on("copilot.prompt", () => setCopilotOpen(true)),
    ];
    const keys = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setPaletteOpen((s) => !s);
      }
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setCopilotOpen((s) => !s);
      }
    };
    window.addEventListener("keydown", keys);
    return () => {
      offs.forEach((off) => off());
      window.removeEventListener("keydown", keys);
    };
  }, []);

  const renderView = () => {
    switch (view) {
      case "dashboard": return <DashboardView />;
      case "projects": return <ProjectsView />;
      case "board": return <BoardView />;
      case "finance": return <FinanceView />;
      case "clients": return <ClientsView />;
      case "notes": return <NotesView />;
      case "settings": return <SettingsView engine={engine} onEngine={setEngineOverride} />;
      default: return <DashboardView />;
    }
  };

  return (
    <div className="app-frame">
      <div className="flex h-full flex-col overflow-hidden rounded-[14px] border border-white/10 bg-[#0a0e17] shadow-[0_40px_120px_-30px_rgba(34,211,238,.18)]">
        <TitleBar onOpenPalette={() => setPaletteOpen(true)} />

        <div className="flex min-h-0 flex-1">
          <Sidebar
            view={view}
            onChange={setView}
            copilotOpen={copilotOpen}
            onToggleCopilot={() => setCopilotOpen((s) => !s)}
            engine={engine}
          />

          {/* مساحة العمل */}
          <main className="relative min-w-0 flex-1 overflow-y-auto">
            <AnimatePresence mode="wait">
              <motion.div
                key={view === "browser" ? "_hold" : view}
                className={cn("min-h-full", view !== "browser" && "pb-8")}
                initial={{ opacity: 0, y: 10, scale: 0.995 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: -8, scale: 0.998 }}
                transition={{ duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              >
                {view !== "browser" && renderView()}
              </motion.div>
            </AnimatePresence>
            {/* المتصفح يبقى حياً دائماً حتى لا يفقد حالته */}
            <div className={cn("absolute inset-0", view === "browser" ? "block" : "hidden")}>
              <BrowserView />
            </div>
          </main>

          <Copilot open={copilotOpen} onClose={() => setCopilotOpen(false)} engine={engine} />
        </div>

        {/* شريط الحالة السفلي */}
        <footer className="flex h-7 shrink-0 items-center gap-3 border-t border-white/6 bg-[#0b0f19]/90 px-4 text-[10px] text-slate-600">
          <span className="font-bold text-slate-500">ميزان AI v1.0</span>
          <span>·</span>
          <span>Ctrl+K الأوامر</span>
          <span>·</span>
          <span>Ctrl+J الوكيل</span>
          <span className="ms-auto flex items-center gap-1.5">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            قاعدة البيانات متصلة
          </span>
        </footer>
      </div>

      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />

      {/* التنبيهات */}
      <div className="pointer-events-none fixed bottom-4 end-4 z-[99] flex flex-col gap-2">
        <AnimatePresence>
          {toasts.map((t) => (
            <motion.div
              key={t.id}
              initial={{ opacity: 0, x: 40, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 30 }}
              className={cn(
                "glass-strong pointer-events-auto flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-bold shadow-xl",
                t.tone === "ok" && "text-emerald-300",
                t.tone === "err" && "text-rose-300",
                t.tone === "info" && "text-sky-300"
              )}
            >
              {t.tone === "ok" ? <CheckCircle2 size={14} /> : t.tone === "err" ? <AlertTriangle size={14} /> : <Info size={14} />}
              {t.message}
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
