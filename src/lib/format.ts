const TZ = "Asia/Kolkata";

const inrFull = new Intl.NumberFormat("en-IN", { maximumFractionDigits: 0 });

/** ₹4,82,500 */
export function inr(amount: number | null | undefined): string {
  if (amount === null || amount === undefined) return "₹0";
  return `₹${inrFull.format(Math.round(amount))}`;
}

/** ₹4.82L / ₹72.4K / ₹1.2Cr */
export function inrCompact(amount: number | null | undefined): string {
  const value = Math.round(Number(amount ?? 0));
  const sign = value < 0 ? "-" : "";
  const abs = Math.abs(value);
  if (abs >= 10_000_000) return `${sign}₹${trim(abs / 10_000_000)}Cr`;
  if (abs >= 100_000) return `${sign}₹${trim(abs / 100_000)}L`;
  if (abs >= 1_000) return `${sign}₹${trim(abs / 1_000)}K`;
  return `${sign}₹${abs}`;
}

function trim(n: number): string {
  const rounded = n >= 100 ? n.toFixed(0) : n.toFixed(2).replace(/\.?0+$/, "");
  return rounded;
}

export function num(value: number | null | undefined): string {
  return inrFull.format(Math.round(Number(value ?? 0)));
}

/** Parses `YYYY-MM-DD` without timezone drift. */
export function parseDay(value: string | Date | null | undefined): Date {
  if (!value) return new Date();
  if (value instanceof Date) return value;
  const [y, m, d] = value.split("T")[0].split("-").map(Number);
  if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return new Date();
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
}

/**
 * Defensive date coercion. Returns null instead of an Invalid Date so formatters
 * can degrade to "—" rather than throwing `RangeError: Invalid time value`.
 * Also normalises two-digit offsets such as `2026-09-16T12:00:00+00`.
 */
export function toDate(value: string | Date | number | null | undefined): Date | null {
  if (value === null || value === undefined || value === "") return null;
  if (value instanceof Date) return Number.isNaN(value.getTime()) ? null : value;
  if (typeof value === "number") {
    const fromNumber = new Date(value);
    return Number.isNaN(fromNumber.getTime()) ? null : fromNumber;
  }
  const text = value.trim();
  if (!text) return null;
  if (/^\d{4}-\d{2}-\d{2}$/.test(text)) return parseDay(text);
  const normalised = text.replace(/([+-]\d{2})$/, "$1:00").replace(/\+00:00$/, "Z");
  const parsed = new Date(normalised);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function toISODate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function formatDate(value: string | Date | null | undefined, opts?: Intl.DateTimeFormatOptions): string {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    timeZone: TZ,
    ...opts,
  }).format(date);
}

export function formatShortDate(value: string | Date | null | undefined): string {
  return formatDate(value, { year: undefined });
}

export function formatMonthDay(value: string | Date | null | undefined): string {
  return formatDate(value, { month: "short", day: "2-digit", year: undefined });
}

export function formatTime(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";
  return new Intl.DateTimeFormat("en-IN", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: TZ,
  }).format(date);
}

export function formatMonth(value: Date | string, withYear = false): string {
  const date = toDate(value) ?? new Date();
  return new Intl.DateTimeFormat("en-IN", {
    month: "short",
    ...(withYear ? { year: "2-digit" as const } : {}),
    timeZone: TZ,
  }).format(date);
}

export function daysBetween(a: Date, b: Date): number {
  return Math.round((startOfDay(b).getTime() - startOfDay(a).getTime()) / 86_400_000);
}

export function startOfDay(date: Date): Date {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 12));
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setUTCDate(next.getUTCDate() + days);
  return next;
}

export function today(): Date {
  return startOfDay(new Date());
}

/** Percentage helper guarded against divide-by-zero. */
export function pct(part: number, whole: number, digits = 1): number {
  if (!whole) return 0;
  return Number(((part / whole) * 100).toFixed(digits));
}

export function initials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? "")
    .join("");
}

export function relativeDay(value: string | Date | null | undefined): string {
  const date = toDate(value);
  if (!date) return "—";
  const diff = daysBetween(today(), date);
  if (diff === 0) return "Today";
  if (diff === 1) return "Tomorrow";
  if (diff === -1) return "Yesterday";
  if (diff > 1 && diff <= 30) return `in ${diff} days`;
  if (diff < -1 && diff >= -30) return `${Math.abs(diff)} days ago`;
  return formatDate(value);
}
