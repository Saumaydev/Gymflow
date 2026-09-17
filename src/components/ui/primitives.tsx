import type { ReactNode } from "react";
import Link from "next/link";
import { pastelBg, type PastelKey } from "@/lib/tokens";
import { initials } from "@/lib/format";

/* ------------------------------------------------------------------ */
/* Surfaces                                                            */
/* ------------------------------------------------------------------ */

export function DarkPanel({
  children,
  className = "",
  padded = true,
  elevated = false,
}: {
  children: ReactNode;
  className?: string;
  padded?: boolean;
  elevated?: boolean;
}) {
  return (
    <section
      className={`gf-hairline rounded-card bg-panel/90 ${elevated ? "shadow-panel" : ""} ${
        padded ? "p-5 sm:p-6" : ""
      } ${className}`}
    >
      {children}
    </section>
  );
}

export function PastelCard({
  children,
  accent = "cyan",
  className = "",
  hero = false,
  padded = true,
}: {
  children: ReactNode;
  accent?: PastelKey;
  className?: string;
  hero?: boolean;
  padded?: boolean;
}) {
  return (
    <section
      className={`gf-pastel-edge text-pastel-ink ${pastelBg[accent]} ${
        hero ? "rounded-hero" : "rounded-card"
      } shadow-float ${padded ? "p-5 sm:p-6" : ""} ${className}`}
    >
      {children}
    </section>
  );
}

export function FloatingCard({
  children,
  className = "",
  accent = "cyan",
}: {
  children: ReactNode;
  className?: string;
  accent?: PastelKey;
}) {
  return (
    <div
      className={`gf-pastel-edge text-pastel-ink ${pastelBg[accent]} rounded-card shadow-lift -rotate-1 p-5 transition-transform duration-500 hover:-translate-y-1 hover:rotate-0 ${className}`}
    >
      {children}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Metric + tiles                                                     */
/* ------------------------------------------------------------------ */

export function MetricCard({
  label,
  value,
  caption,
  icon,
  accent,
  hint,
  href,
  className = "",
}: {
  label: string;
  value: string;
  caption?: string;
  icon?: ReactNode;
  accent: PastelKey;
  hint?: string;
  href?: string;
  className?: string;
}) {
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        {icon ? <IconTile accent={accent}>{icon}</IconTile> : <span />}
        {hint ? <span className="text-[11px] font-medium tracking-wide text-pastel-ink/55">{hint}</span> : null}
      </div>
      <p className="gf-num mt-4 text-[30px] font-semibold leading-none sm:text-[34px]">{value}</p>
      <p className="mt-1.5 text-[13px] font-semibold text-pastel-ink/75">{label}</p>
      {caption ? <p className="mt-0.5 text-[12px] text-pastel-ink/55">{caption}</p> : null}
    </>
  );

  const classes = `${pastelBg[accent]} gf-pastel-edge text-pastel-ink rounded-card shadow-float p-5 ${className}`;
  if (href) {
    return (
      <Link href={href} className={`${classes} block transition-transform duration-300 hover:-translate-y-1`}>
        {body}
      </Link>
    );
  }
  return <div className={classes}>{body}</div>;
}

export function IconTile({
  children,
  accent = "cyan",
  size = "md",
  className = "",
}: {
  children: ReactNode;
  accent?: PastelKey | "dark";
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  const dims = size === "sm" ? "h-8 w-8" : size === "lg" ? "h-12 w-12" : "h-10 w-10";
  const bg = accent === "dark" ? "bg-white/8 text-ghost" : `${pastelBg[accent]} text-pastel-ink`;
  return (
    <span
      className={`${dims} ${bg} inline-flex shrink-0 items-center justify-center rounded-full ${className}`}
      aria-hidden="true"
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------------ */
/* Controls                                                           */
/* ------------------------------------------------------------------ */

export function GlassButton({
  children,
  variant = "ghost",
  size = "md",
  className = "",
  type = "button",
  ...rest
}: {
  children: ReactNode;
  variant?: "primary" | "ghost" | "pastel" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
} & React.ButtonHTMLAttributes<HTMLButtonElement>) {
  const sizes = size === "sm" ? "h-9 px-3.5 text-[12px]" : size === "lg" ? "h-14 px-6 text-[15px]" : "h-11 px-4 text-[13px]";
  const variants: Record<string, string> = {
    primary: "bg-ghost text-pastel-ink hover:bg-white",
    ghost: "gf-glass text-ghost hover:bg-white/10",
    pastel: "bg-pastel-cyan text-pastel-ink hover:bg-white",
    danger: "bg-pastel-blush text-pastel-ink hover:bg-white",
  };
  return (
    <button
      type={type}
      className={`${sizes} ${variants[variant]} inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-all duration-200 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50 ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}

/** Anchor styled exactly like GlassButton — use inside <Link>-free markup to avoid nesting <button> in <a>. */
export function GlassLink({
  children,
  href,
  variant = "ghost",
  size = "md",
  className = "",
  target,
  rel,
}: {
  children: ReactNode;
  href: string;
  variant?: "primary" | "ghost" | "pastel" | "danger";
  size?: "sm" | "md" | "lg";
  className?: string;
  target?: string;
  rel?: string;
}) {
  const sizes = size === "sm" ? "h-9 px-3.5 text-[12px]" : size === "lg" ? "h-14 px-6 text-[15px]" : "h-11 px-4 text-[13px]";
  const variants: Record<string, string> = {
    primary: "bg-ghost text-pastel-ink hover:bg-white",
    ghost: "gf-glass text-ghost hover:bg-white/10",
    pastel: "bg-pastel-cyan text-pastel-ink hover:bg-white",
    danger: "bg-pastel-blush text-pastel-ink hover:bg-white",
  };
  return (
    <Link
      href={href}
      target={target}
      rel={rel}
      className={`${sizes} ${variants[variant]} inline-flex items-center justify-center gap-2 rounded-pill font-semibold transition-all duration-200 active:scale-[.97] ${className}`}
    >
      {children}
    </Link>
  );
}

export function Pill({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: "neutral" | "positive" | "warning" | "danger" | "info";
  className?: string;
}) {
  const tones: Record<string, string> = {
    neutral: "bg-white/8 text-ghost-dim",
    positive: "bg-accent-green/16 text-accent-green",
    warning: "bg-accent-purple/16 text-accent-purple",
    danger: "bg-pastel-blush/90 text-pastel-ink",
    info: "bg-accent-cyan/16 text-accent-cyan",
  };
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-pill px-3 py-1 text-[11px] font-semibold tracking-wide ${tones[tone]} ${className}`}>
      {children}
    </span>
  );
}

export function StatusDot({ status, label }: { status: string; label?: string }) {
  const map: Record<string, { color: string; text: string }> = {
    ACTIVE: { color: "bg-accent-green", text: "text-accent-green" },
    EXPIRING: { color: "bg-accent-purple", text: "text-accent-purple" },
    EXPIRED: { color: "bg-ghost-muted", text: "text-ghost-dim" },
    INACTIVE: { color: "bg-ghost-muted", text: "text-ghost-dim" },
    FROZEN: { color: "bg-accent-cyan", text: "text-accent-cyan" },
    PARTIAL: { color: "bg-accent-purple", text: "text-accent-purple" },
    PAID: { color: "bg-accent-green", text: "text-accent-green" },
    PENDING: { color: "bg-accent-blue", text: "text-accent-blue" },
    OVERDUE: { color: "bg-pastel-blush", text: "text-pastel-blush" },
    CANCELLED: { color: "bg-ghost-muted", text: "text-ghost-dim" },
  };
  const meta = map[status] ?? { color: "bg-ghost-muted", text: "text-ghost-dim" };
  return (
    <span className={`inline-flex items-center gap-2 text-[12px] font-semibold ${meta.text}`}>
      <span className={`h-1.5 w-1.5 rounded-full ${meta.color}`} />
      {label ?? status}
    </span>
  );
}

export function ProgressBar({
  value,
  accent = "cyan",
  height = 8,
  track = "rgba(24,24,28,.14)",
}: {
  value: number;
  accent?: string;
  height?: number;
  track?: string;
}) {
  const width = Math.max(0, Math.min(100, value));
  return (
    <div className="w-full overflow-hidden rounded-pill" style={{ height, background: track }} role="progressbar" aria-valuenow={width} aria-valuemin={0} aria-valuemax={100}>
      <div
        className="h-full rounded-pill transition-[width] duration-700"
        style={{ width: `${width}%`, background: accent }}
      />
    </div>
  );
}

export function SectionHeading({
  title,
  caption,
  action,
  className = "",
}: {
  title: string;
  caption?: string;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={`flex flex-wrap items-end justify-between gap-3 ${className}`}>
      <div>
        <h2 className="text-[17px] font-semibold tracking-tight text-ghost sm:text-[19px]">{title}</h2>
        {caption ? <p className="mt-0.5 text-[12.5px] text-ghost-dim">{caption}</p> : null}
      </div>
      {action}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Feedback states                                                    */
/* ------------------------------------------------------------------ */

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`gf-shimmer rounded-card bg-white/5 ${className}`} aria-hidden="true" />;
}

export function EmptyState({
  icon,
  title,
  message,
  action,
}: {
  icon: ReactNode;
  title: string;
  message: string;
  action?: ReactNode;
}) {
  return (
    <div className="gf-hairline flex flex-col items-center justify-center gap-3 rounded-card bg-panel/60 px-6 py-14 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-full bg-pastel-lavender text-pastel-ink">{icon}</span>
      <h3 className="text-[17px] font-semibold text-ghost">{title}</h3>
      <p className="max-w-sm text-[13px] text-ghost-dim">{message}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, retry }: { message: string; retry?: ReactNode }) {
  return (
    <div className="gf-hairline rounded-card bg-panel/70 p-6 text-center">
      <p className="text-[15px] font-semibold text-ghost">Something went wrong</p>
      <p className="mt-1 text-[13px] text-ghost-dim">{message}</p>
      {retry}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Identity                                                           */
/* ------------------------------------------------------------------ */

export function Avatar({
  name,
  size = 44,
  accent,
  className = "",
}: {
  name: string;
  size?: number;
  accent?: PastelKey;
  className?: string;
}) {
  const keys: PastelKey[] = ["cyan", "lavender", "cream", "blush", "sage", "blue"];
  const key = accent ?? keys[name.length % keys.length];
  return (
    <span
      className={`${pastelBg[key]} text-pastel-ink inline-flex shrink-0 items-center justify-center rounded-full font-semibold ${className}`}
      style={{ width: size, height: size, fontSize: size * 0.36 }}
      aria-hidden="true"
    >
      {initials(name)}
    </span>
  );
}

export function KeyValue({ label, value, mono = false }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="min-w-0">
      <p className="text-[11.5px] uppercase tracking-[0.14em] text-ghost-muted">{label}</p>
      <p className={`mt-1 truncate text-[14px] font-medium text-ghost ${mono ? "gf-num" : ""}`}>{value}</p>
    </div>
  );
}
