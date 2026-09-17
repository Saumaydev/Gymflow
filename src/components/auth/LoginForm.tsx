"use client";

import { useState } from "react";
import { ArrowRight, Eye, EyeOff, Loader2, Lock, Mail } from "lucide-react";
import { toast } from "@/components/ui/overlay";

export function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [reveal, setReveal] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);
    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = (await response.json()) as { error?: string; redirectTo?: string };
      if (!response.ok) {
        setError(data.error ?? "Unable to sign in.");
        setPending(false);
        return;
      }
      toast({ title: "Signed in", message: "Opening your console…", tone: "success" });
      // Hard navigation guarantees a fresh session cookie is applied everywhere.
      window.location.assign(data.redirectTo ?? "/admin");
    } catch {
      setError("Network error — please try again.");
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <label className="block">
        <span className="mb-2 block text-[11.5px] font-semibold uppercase tracking-[0.14em] text-pastel-ink/55">Email</span>
        <span className="flex h-[56px] items-center gap-3 rounded-control border border-pastel-ink/10 bg-white/70 px-4">
          <Mail size={17} className="text-pastel-ink/45" />
          <input
            name="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="h-full flex-1 bg-transparent text-[14.5px] text-pastel-ink placeholder:text-pastel-ink/40 focus:outline-none"
            placeholder="you@gym.com"
          />
        </span>
      </label>

      <label className="block">
        <span className="mb-2 block text-[11.5px] font-semibold uppercase tracking-[0.14em] text-pastel-ink/55">Password</span>
        <span className="flex h-[56px] items-center gap-3 rounded-control border border-pastel-ink/10 bg-white/70 px-4">
          <Lock size={17} className="text-pastel-ink/45" />
          <input
            name="password"
            type={reveal ? "text" : "password"}
            required
            minLength={6}
            autoComplete="current-password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="h-full flex-1 bg-transparent text-[14.5px] text-pastel-ink placeholder:text-pastel-ink/40 focus:outline-none"
            placeholder="••••••••"
          />
          <button
            type="button"
            onClick={() => setReveal((prev) => !prev)}
            aria-label={reveal ? "Hide password" : "Show password"}
            className="rounded-full p-1.5 text-pastel-ink/45 transition hover:bg-pastel-ink/5 hover:text-pastel-ink"
          >
            {reveal ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </span>
      </label>

      {error ? (
        <p className="rounded-control bg-white/70 px-4 py-3 text-[12.5px] font-medium text-[#8a2c3a]" role="alert">
          {error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="flex h-[56px] w-full items-center justify-center gap-2 rounded-pill bg-pastel-ink text-[14.5px] font-semibold text-pastel-cream transition hover:bg-black active:scale-[.99] disabled:opacity-70"
      >
        {pending ? <Loader2 size={17} className="animate-spin" /> : null}
        {pending ? "Signing in…" : "Sign In"}
        {!pending ? <ArrowRight size={17} /> : null}
      </button>

      <p className="pt-1 text-[11.5px] leading-relaxed text-pastel-ink/50">
        Access is role based — owners see the full console, coaches see their roster, members see only their own membership.
      </p>
    </form>
  );
}
