"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Copy, Eye, EyeOff, KeyRound, Power, RefreshCw, Trash2, TriangleAlert } from "lucide-react";
import { Modal, toast } from "@/components/ui/overlay";
import { Field } from "@/components/ui/form";
import { GlassButton, GlassLink, IconTile, KeyValue, Pill } from "@/components/ui/primitives";

export type AccountControlsProps = {
  kind: "member" | "trainer";
  id: number;
  name: string;
  code: string;
  email: string | null;
  storedPassword: string | null;
  active: boolean;
  redirectTo: string;
};

/** Owner-only credentials card: reveal, copy and rotate the login password. */
export function CredentialsCard({
  kind,
  id,
  name,
  email,
  storedPassword,
}: {
  kind: "member" | "trainer";
  id: number;
  name: string;
  email: string | null;
  storedPassword: string | null;
}) {
  const [password, setPassword] = useState(storedPassword);
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function copy(value: string, key: string) {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(key);
      window.setTimeout(() => setCopied(null), 1600);
    } catch {
      toast({ title: "Copy blocked", message: "Copy the value manually.", tone: "error" });
    }
  }

  async function rotate() {
    setPending(true);
    try {
      const response = await fetch(`/api/${kind === "member" ? "members" : "trainers"}/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reset-password" }),
      });
      const data = (await response.json()) as { password?: string; error?: string };
      if (!response.ok || !data.password) throw new Error(data.error ?? "Could not reset the password");
      setPassword(data.password);
      setRevealed(true);
      toast({ title: "New password generated", message: "Share it securely with the member.", tone: "success" });
    } catch (error) {
      toast({ title: "Reset failed", message: (error as Error).message, tone: "error" });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <IconTile accent="cream" size="sm">
          <KeyRound size={14} />
        </IconTile>
        <div>
          <p className="text-[13px] font-semibold text-ghost">Login credentials</p>
          <p className="text-[11px] text-ghost-muted">Visible to gym owners only — never shown to the member.</p>
        </div>
      </div>

      <div className="space-y-3">
        <div className="rounded-card border border-white/7 bg-white/4 p-4">
          <p className="text-[11px] uppercase tracking-[0.14em] text-ghost-muted">Email</p>
          <div className="mt-1.5 flex items-center gap-2">
            <p className="min-w-0 flex-1 truncate text-[13.5px] font-medium text-ghost">{email ?? "—"}</p>
            {email ? (
              <button
                onClick={() => copy(email, "email")}
                className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-ghost-dim hover:bg-white/10"
                aria-label="Copy email"
              >
                {copied === "email" ? <Check size={13} /> : <Copy size={13} />}
              </button>
            ) : null}
          </div>
        </div>

        <div className="rounded-card border border-white/7 bg-white/4 p-4">
          <div className="flex items-center justify-between">
            <p className="text-[11px] uppercase tracking-[0.14em] text-ghost-muted">Password</p>
            <Pill tone={password ? "positive" : "warning"}>{password ? "stored" : "not stored"}</Pill>
          </div>
          <div className="mt-1.5 flex items-center gap-2">
            <p className="gf-num min-w-0 flex-1 truncate text-[14px] font-semibold tracking-[0.06em] text-ghost">
              {password ? (revealed ? password : "•".repeat(Math.min(14, password.length))) : "Reset to generate one"}
            </p>
            {password ? (
              <>
                <button
                  onClick={() => setRevealed((prev) => !prev)}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-ghost-dim hover:bg-white/10"
                  aria-label={revealed ? "Hide password" : "Show password"}
                >
                  {revealed ? <EyeOff size={13} /> : <Eye size={13} />}
                </button>
                <button
                  onClick={() => copy(password, "password")}
                  className="flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-ghost-dim hover:bg-white/10"
                  aria-label="Copy password"
                >
                  {copied === "password" ? <Check size={13} /> : <Copy size={13} />}
                </button>
              </>
            ) : null}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <GlassButton size="sm" onClick={rotate} disabled={pending}>
          <RefreshCw size={14} className={pending ? "animate-spin" : ""} />
          {pending ? "Generating…" : "Generate new password"}
        </GlassButton>
        <GlassButton size="sm" onClick={() => copy(`${name} · ${email ?? ""} · ${password ?? ""}`, "all")}>
          {copied === "all" ? <Check size={14} /> : <Copy size={14} />} Copy all
        </GlassButton>
      </div>
    </div>
  );
}

/** Deactivate / reactivate + permanent delete controls. */
export function AccountDangerZone({ kind, id, name, code, active, redirectTo }: AccountControlsProps) {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [pending, setPending] = useState(false);
  const [isActive, setIsActive] = useState(active);
  const router = useRouter();
  const endpoint = `/api/${kind === "member" ? "members" : "trainers"}/${id}`;
  const noun = kind === "member" ? "Member" : "Trainer";

  async function toggleActive() {
    setPending(true);
    try {
      const response = await fetch(endpoint, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: isActive ? "deactivate" : "activate" }),
      });
      const data = (await response.json()) as { status?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not update the account");
      setIsActive(data.status === "ACTIVE");
      toast({
        title: data.status === "ACTIVE" ? `${noun} reactivated` : `${noun} deactivated`,
        message: data.status === "ACTIVE" ? `${name} can sign in again.` : `${name} can no longer sign in or check in.`,
        tone: data.status === "ACTIVE" ? "success" : "info",
      });
      router.refresh();
    } catch (error) {
      toast({ title: "Update failed", message: (error as Error).message, tone: "error" });
    } finally {
      setPending(false);
    }
  }

  async function destroy() {
    setPending(true);
    try {
      const response = await fetch(`${endpoint}?confirm=${encodeURIComponent(typed)}`, { method: "DELETE" });
      const data = (await response.json()) as { deleted?: string; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Could not delete");
      toast({ title: `${noun} deleted permanently`, message: `${name} and all related records were removed.`, tone: "success" });
      window.location.assign(redirectTo);
    } catch (error) {
      toast({ title: "Deletion failed", message: (error as Error).message, tone: "error" });
      setPending(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <IconTile accent={isActive ? "sage" : "blush"} size="sm">
            <Power size={14} />
          </IconTile>
          <div>
            <p className="text-[13px] font-semibold text-ghost">Account status</p>
            <p className="text-[11px] text-ghost-muted">
              {isActive ? "Active — signs in and checks in normally" : "Deactivated — sign-in and check-in blocked"}
            </p>
          </div>
        </div>
        <Pill tone={isActive ? "positive" : "danger"}>{isActive ? "Active" : "Deactivated"}</Pill>
      </div>

      {kind === "member" ? (
        <div className="grid gap-3 sm:grid-cols-2">
          <KeyValue label="Member code" value={code} mono />
          <KeyValue label="Permanent delete removes" value="Ledger, attendance, subscriptions, login" />
        </div>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2">
          <KeyValue label="Trainer code" value={code} mono />
          <KeyValue label="Permanent delete removes" value="Contract, attendance, roster links, login" />
        </div>
      )}

      <div className="flex flex-wrap gap-2.5">
        <GlassButton size="sm" variant={isActive ? "danger" : "primary"} onClick={toggleActive} disabled={pending}>
          <Power size={14} />
          {isActive ? "Deactivate account" : "Reactivate account"}
        </GlassButton>
        <GlassButton size="sm" variant="danger" onClick={() => setConfirmOpen(true)}>
          <Trash2 size={14} /> Delete permanently
        </GlassButton>
        <GlassLink size="sm" href={redirectTo}>
          Back to list
        </GlassLink>
      </div>

      <Modal
        open={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        title={`Delete ${name} permanently?`}
        subtitle="This cannot be undone — the profile, billing history and login are erased."
        footer={
          <>
            <GlassButton onClick={() => setConfirmOpen(false)}>Cancel</GlassButton>
            <GlassButton variant="danger" onClick={destroy} disabled={pending || typed.trim().toUpperCase() !== code.toUpperCase()}>
              <Trash2 size={15} /> {pending ? "Deleting…" : "Delete forever"}
            </GlassButton>
          </>
        }
      >
        <div className="space-y-4">
          <div className="flex items-start gap-3 rounded-card bg-pastel-blush p-4 text-pastel-ink">
            <TriangleAlert size={18} className="mt-0.5" />
            <p className="text-[12.5px] font-semibold">
              Type <span className="gf-num">{code}</span> below to confirm. Every payment, receipt, subscription and
              attendance record for {name} will be permanently removed.
            </p>
          </div>
          <Field label="Confirm code">
            <input
              value={typed}
              onChange={(event) => setTyped(event.target.value)}
              placeholder={code}
              autoComplete="off"
              className="h-[52px] w-full rounded-control border border-white/8 bg-white/5 px-4 text-[14px] uppercase tracking-[0.1em] text-ghost placeholder:text-ghost-muted focus:border-accent-blue/60 focus:outline-none"
            />
          </Field>
        </div>
      </Modal>
    </div>
  );
}
