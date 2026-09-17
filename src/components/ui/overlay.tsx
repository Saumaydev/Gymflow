"use client";

import { useEffect, useState, type ReactNode } from "react";
import { X } from "lucide-react";

/* ------------------------------------------------------------------ */
/* Modal / BottomSheet (PRD §89, §86)                                  */
/* ------------------------------------------------------------------ */

export function Modal({
  open,
  onClose,
  title,
  subtitle,
  children,
  footer,
  width = "max-w-xl",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: ReactNode;
  footer?: ReactNode;
  width?: string;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70] flex items-end justify-center sm:items-center" role="dialog" aria-modal="true" aria-label={title}>
      <button className="absolute inset-0 animate-[fade-in_.25s_ease-out] bg-black/55 backdrop-blur-md" onClick={onClose} aria-label="Close dialog" />
      <div
        className={`relative z-10 w-full ${width} animate-[fade-up_.35s_cubic-bezier(.22,1,.36,1)] rounded-t-hero border border-white/8 bg-panel/95 shadow-lift backdrop-blur-2xl sm:rounded-hero`}
      >
        <div className="flex items-start justify-between gap-4 border-b border-white/6 px-6 py-5">
          <div>
            <h3 className="text-[17px] font-semibold text-ghost">{title}</h3>
            {subtitle ? <p className="mt-0.5 text-[12.5px] text-ghost-dim">{subtitle}</p> : null}
          </div>
          <button onClick={onClose} className="rounded-full p-2 text-ghost-dim transition hover:bg-white/8 hover:text-ghost" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="max-h-[70vh] overflow-y-auto px-6 py-5" data-left-panel>
          {children}
        </div>
        {footer ? <div className="flex flex-wrap justify-end gap-3 border-t border-white/6 px-6 py-4">{footer}</div> : null}
      </div>
    </div>
  );
}

export function Drawer({
  open,
  onClose,
  title,
  children,
  side = "right",
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  side?: "right" | "left";
}) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[70]">
      <button className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} aria-label="Close panel" />
      <aside
        className={`absolute top-0 h-full w-[min(420px,92vw)] animate-[fade-in_.3s_ease-out] border-white/8 bg-panel/95 p-6 shadow-lift backdrop-blur-2xl ${
          side === "right" ? "right-0 rounded-l-hero border-l" : "left-0 rounded-r-hero border-r"
        }`}
      >
        <div className="mb-5 flex items-center justify-between">
          <h3 className="text-[17px] font-semibold text-ghost">{title}</h3>
          <button onClick={onClose} className="rounded-full p-2 text-ghost-dim hover:bg-white/8" aria-label="Close">
            <X size={16} />
          </button>
        </div>
        <div className="h-[calc(100%-64px)] overflow-y-auto pr-1">{children}</div>
      </aside>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Toast (PRD §80, §81) — event based so any component can call it      */
/* ------------------------------------------------------------------ */

export type ToastTone = "success" | "error" | "info";
export type ToastPayload = { title: string; message?: string; tone?: ToastTone };

const TOAST_EVENT = "gymflow:toast";

export function toast(payload: ToastPayload) {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new CustomEvent<ToastPayload>(TOAST_EVENT, { detail: payload }));
}

export function Toaster() {
  const [items, setItems] = useState<(ToastPayload & { id: number })[]>([]);

  useEffect(() => {
    const handler = (event: Event) => {
      const detail = (event as CustomEvent<ToastPayload>).detail;
      const id = Date.now() + Math.random();
      setItems((prev) => [...prev, { ...detail, id }]);
      window.setTimeout(() => setItems((prev) => prev.filter((item) => item.id !== id)), 4200);
    };
    window.addEventListener(TOAST_EVENT, handler);
    return () => window.removeEventListener(TOAST_EVENT, handler);
  }, []);

  return (
    <div className="pointer-events-none fixed bottom-24 left-1/2 z-[90] flex w-[min(420px,92vw)] -translate-x-1/2 flex-col gap-3 sm:bottom-8 sm:left-auto sm:right-8 sm:translate-x-0">
      {items.map((item) => (
        <div
          key={item.id}
          className="pointer-events-auto flex animate-[fade-up_.35s_cubic-bezier(.22,1,.36,1)] items-start gap-3 rounded-card border border-white/8 bg-panel/95 p-4 shadow-lift backdrop-blur-xl"
          role="status"
        >
          <span
            className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-[15px] font-semibold text-pastel-ink ${
              item.tone === "error" ? "bg-pastel-blush" : item.tone === "info" ? "bg-pastel-lavender" : "bg-accent-green/90"
            }`}
          >
            {item.tone === "error" ? "!" : "✓"}
          </span>
          <div className="min-w-0">
            <p className="text-[13.5px] font-semibold text-ghost">{item.title}</p>
            {item.message ? <p className="mt-0.5 text-[12.5px] text-ghost-dim">{item.message}</p> : null}
          </div>
        </div>
      ))}
    </div>
  );
}
