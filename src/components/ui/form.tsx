"use client";

import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { Search, SlidersHorizontal } from "lucide-react";

const inputBase =
  "h-[52px] w-full rounded-control border border-white/8 bg-white/5 px-4 text-[14px] text-ghost placeholder:text-ghost-muted transition focus:border-accent-blue/60 focus:bg-white/8 focus:outline-none";

export function Field({
  label,
  hint,
  children,
  className = "",
}: {
  label: string;
  hint?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-2 block text-[11.5px] font-semibold uppercase tracking-[0.14em] text-ghost-muted">{label}</span>
      {children}
      {hint ? <span className="mt-1.5 block text-[11.5px] text-ghost-muted">{hint}</span> : null}
    </label>
  );
}

export function TextField({
  label,
  hint,
  className = "",
  ...rest
}: { label: string; hint?: string; className?: string } & React.InputHTMLAttributes<HTMLInputElement> & { name: string }) {
  return (
    <Field label={label} hint={hint} className={className}>
      <input {...rest} className={inputBase} />
    </Field>
  );
}

export function TextArea({
  label,
  rows = 3,
  className = "",
  ...rest
}: { label: string; rows?: number; className?: string } & React.TextareaHTMLAttributes<HTMLTextAreaElement> & { name: string }) {
  return (
    <Field label={label} className={className}>
      <textarea
        rows={rows}
        {...rest}
        className="w-full rounded-control border border-white/8 bg-white/5 px-4 py-3 text-[14px] text-ghost placeholder:text-ghost-muted transition focus:border-accent-blue/60 focus:bg-white/8 focus:outline-none"
      />
    </Field>
  );
}

export function SelectField({
  label,
  name,
  options,
  defaultValue,
  hint,
  className = "",
}: {
  label: string;
  name: string;
  options: { value: string; label: string }[];
  defaultValue?: string;
  hint?: string;
  className?: string;
}) {
  return (
    <Field label={label} hint={hint} className={className}>
      <select name={name} defaultValue={defaultValue} className={`${inputBase} appearance-none bg-panel`}>
        {options.map((option) => (
          <option key={option.value} value={option.value} className="bg-panel text-ghost">
            {option.label}
          </option>
        ))}
      </select>
    </Field>
  );
}

/** Debounced URL-synced search (PRD §108) */
export function SearchBar({
  placeholder = "Search members, receipts, trainers…",
  paramName = "q",
  className = "",
}: {
  placeholder?: string;
  paramName?: string;
  className?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [value, setValue] = useState(params.get(paramName) ?? "");

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const next = new URLSearchParams(params.toString());
      if (value) next.set(paramName, value);
      else next.delete(paramName);
      next.delete("page");
      const query = next.toString();
      router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
    }, 350);
    return () => window.clearTimeout(handle);
  }, [value, paramName, pathname, params, router]);

  return (
    <div className={`relative ${className}`}>
      <Search size={16} className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-ghost-muted" />
      <input
        value={value}
        onChange={(event) => setValue(event.target.value)}
        placeholder={placeholder}
        aria-label={placeholder}
        className={`${inputBase} pl-11`}
      />
    </div>
  );
}

/** Filter popover rendered as a compact chip row (PRD §28) */
export function FilterChips({
  paramName = "filter",
  options,
}: {
  paramName?: string;
  options: { value: string; label: string; count?: number }[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const active = params.get(paramName) ?? "";

  const apply = (value: string) => {
    const next = new URLSearchParams(params.toString());
    if (value && value !== active) next.set(paramName, value);
    else next.delete(paramName);
    next.delete("page");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname, { scroll: false });
  };

  return (
    <div className="gf-scroll-x flex items-center gap-2">
      <SlidersHorizontal size={14} className="shrink-0 text-ghost-muted" />
      {options.map((option) => {
        const isActive = active === option.value;
        return (
          <button
            key={option.value || "all"}
            onClick={() => apply(option.value)}
            aria-pressed={isActive}
            className={`shrink-0 rounded-pill px-3.5 py-2 text-[12px] font-semibold transition ${
              isActive ? "bg-ghost text-pastel-ink" : "border border-white/8 bg-white/5 text-ghost-dim hover:bg-white/10 hover:text-ghost"
            }`}
          >
            {option.label}
            {option.count !== undefined ? <span className="ml-1.5 opacity-60">{option.count}</span> : null}
          </button>
        );
      })}
    </div>
  );
}

export function SubmitButton({
  children,
  className = "",
  pendingLabel = "Saving…",
  variant = "primary",
}: {
  children: ReactNode;
  className?: string;
  pendingLabel?: string;
  variant?: "primary" | "pastel" | "ghost";
}) {
  const [pending, setPending] = useState(false);
  const styles: Record<string, string> = {
    primary: "bg-ghost text-pastel-ink hover:bg-white",
    pastel: "bg-pastel-cyan text-pastel-ink hover:bg-white",
    ghost: "border border-white/8 bg-white/5 text-ghost hover:bg-white/10",
  };
  return (
    <button
      type="submit"
      onClick={() => setPending(true)}
      disabled={pending}
      className={`h-[52px] rounded-pill px-6 text-[14px] font-semibold transition active:scale-[.98] disabled:opacity-60 ${styles[variant]} ${className}`}
    >
      {pending ? pendingLabel : children}
    </button>
  );
}
