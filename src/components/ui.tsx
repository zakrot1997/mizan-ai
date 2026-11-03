"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X, Loader2 } from "lucide-react";
import { ReactNode, useEffect } from "react";
import { cn } from "@/lib/utils";

export function GlassCard({
  children,
  className,
  glow,
}: {
  children: ReactNode;
  className?: string;
  glow?: string;
}) {
  return (
    <div
      className={cn("glass relative rounded-2xl p-5", className)}
      style={glow ? { boxShadow: `0 0 60px -18px ${glow}` } : undefined}
    >
      {children}
    </div>
  );
}

export function Btn({
  children,
  onClick,
  variant = "primary",
  className,
  disabled,
  type = "button",
}: {
  children: ReactNode;
  onClick?: () => void;
  variant?: "primary" | "ghost" | "danger" | "soft";
  className?: string;
  disabled?: boolean;
  type?: "button" | "submit";
}) {
  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={cn(
        "btn-base",
        variant === "primary" && "btn-primary",
        variant === "ghost" && "btn-ghost",
        variant === "soft" && "btn-soft",
        variant === "danger" && "btn-danger",
        disabled && "opacity-50 pointer-events-none",
        className
      )}
    >
      {children}
    </button>
  );
}

export function IconBtn({
  children,
  onClick,
  title,
  className,
  active,
}: {
  children: ReactNode;
  onClick?: () => void;
  title?: string;
  className?: string;
  active?: boolean;
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className={cn(
        "grid place-items-center h-9 w-9 rounded-xl text-slate-400 transition-all duration-200 hover:text-white hover:bg-white/10 active:scale-90",
        active && "bg-cyan-400/15 text-cyan-300",
        className
      )}
    >
      {children}
    </button>
  );
}

export function Badge({
  children,
  color = "#38bdf8",
  className,
}: {
  children: ReactNode;
  color?: string;
  className?: string;
}) {
  return (
    <span
      className={cn("inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11px] font-semibold", className)}
      style={{ color, background: `${color}1f`, border: `1px solid ${color}33` }}
    >
      {children}
    </span>
  );
}

export function Progress({ value, color = "#22d3ee", className }: { value: number; color?: string; className?: string }) {
  return (
    <div className={cn("h-1.5 w-full overflow-hidden rounded-full bg-white/8", className)}>
      <motion.div
        className="h-full rounded-full"
        style={{ background: `linear-gradient(90deg, ${color}, ${color}cc)` }}
        initial={{ width: 0 }}
        animate={{ width: `${Math.min(100, Math.max(0, value))}%` }}
        transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      />
    </div>
  );
}

export function Ring({ value, size = 52, color = "#22d3ee", stroke = 5 }: { value: number; size?: number; color?: string; stroke?: number }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,.08)" strokeWidth={stroke} fill="none" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={color}
          strokeWidth={stroke}
          fill="none"
          strokeLinecap="round"
          strokeDasharray={c}
          initial={{ strokeDashoffset: c }}
          animate={{ strokeDashoffset: c - (c * Math.min(100, value)) / 100 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute inset-0 grid place-items-center text-[11px] font-bold text-slate-200">
        {Math.round(value)}٪
      </span>
    </div>
  );
}

export function Modal({
  open,
  onClose,
  title,
  children,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  wide?: boolean;
}) {
  useEffect(() => {
    if (!open) return;
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[90] grid place-items-center bg-black/60 backdrop-blur-sm p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className={cn("glass-strong w-full rounded-3xl p-6 shadow-2xl", wide ? "max-w-3xl" : "max-w-lg")}
            initial={{ y: 30, scale: 0.96, opacity: 0 }}
            animate={{ y: 0, scale: 1, opacity: 1 }}
            exit={{ y: 20, scale: 0.97, opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 28 }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">{title}</h3>
              <IconBtn onClick={onClose} title="إغلاق">
                <X size={18} />
              </IconBtn>
            </div>
            {children}
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

export function Field({
  label,
  children,
  className,
}: {
  label: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={cn("block", className)}>
      <span className="mb-1.5 block text-xs font-semibold text-slate-400">{label}</span>
      {children}
    </label>
  );
}

export function EmptyState({
  icon,
  title,
  hint,
  action,
}: {
  icon: ReactNode;
  title: string;
  hint?: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 py-14 text-center">
      <div className="grid h-16 w-16 place-items-center rounded-2xl bg-white/5 text-slate-500">{icon}</div>
      <p className="font-bold text-slate-300">{title}</p>
      {hint && <p className="max-w-xs text-sm text-slate-500">{hint}</p>}
      {action}
    </div>
  );
}

export function Spinner({ label }: { label?: string }) {
  return (
    <div className="flex items-center justify-center gap-2 py-14 text-slate-400">
      <Loader2 className="animate-spin" size={18} />
      <span className="text-sm">{label ?? "جارٍ التحميل…"}</span>
    </div>
  );
}

/** أرقام متحركة */
export function Counter({ value, format }: { value: number; format?: (n: number) => string }) {
  return (
    <motion.span
      key={value}
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      {format ? format(value) : Math.round(value)}
    </motion.span>
  );
}
