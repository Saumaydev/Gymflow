"use client";

import { useState } from "react";
import { BellRing, Check, CreditCard, Gift, Megaphone, PartyPopper, TriangleAlert, UserCheck } from "lucide-react";
import { toast } from "@/components/ui/overlay";
import { IconTile, Pill } from "@/components/ui/primitives";
import { formatDate, formatTime } from "@/lib/format";

export type MemberNotification = {
  id: number;
  title: string;
  message: string;
  type: string;
  createdAt: Date;
  readAt: Date | null;
};

const ICONS: Record<string, React.ComponentType<{ size?: number }>> = {
  ANNOUNCEMENT: Megaphone,
  PAYMENT: CreditCard,
  MEMBERSHIP: BellRing,
  HOLIDAY: Gift,
  EMERGENCY: TriangleAlert,
  EVENT: PartyPopper,
  TRAINER: UserCheck,
};

export function NotificationList({ items }: { items: MemberNotification[] }) {
  const [list, setList] = useState(items);
  const [pending, setPending] = useState(false);

  async function markRead(id?: number) {
    setPending(true);
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(id ? { notificationId: id } : {}),
      });
      setList((prev) =>
        prev.map((item) => (!id || item.id === id ? { ...item, readAt: item.readAt ?? new Date() } : item)),
      );
      toast({ title: id ? "Marked as read" : "All notifications read", tone: "success" });
    } catch {
      toast({ title: "Could not update", tone: "error" });
    } finally {
      setPending(false);
    }
  }

  const unread = list.filter((item) => !item.readAt).length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Pill tone={unread ? "info" : "positive"}>{unread} unread</Pill>
          <span className="text-[12.5px] text-ghost-muted">{list.length} total</span>
        </div>
        <button
          onClick={() => markRead()}
          disabled={pending || unread === 0}
          className="inline-flex h-10 items-center gap-2 rounded-pill border border-white/8 bg-white/5 px-4 text-[12px] font-semibold text-ghost-dim transition hover:bg-white/10 disabled:opacity-50"
        >
          <Check size={14} /> Mark all read
        </button>
      </div>

      <ul className="space-y-3">
        {list.map((item) => {
          const Icon = ICONS[item.type] ?? BellRing;
          return (
            <li
              key={item.id}
              className={`rounded-card border p-5 transition ${
                item.readAt ? "border-white/7 bg-panel/70" : "border-accent-blue/40 bg-accent-blue/10 shadow-glow"
              }`}
            >
              <div className="flex items-start gap-4">
                <IconTile accent={item.readAt ? "cream" : "cyan"}>
                  <Icon size={16} />
                </IconTile>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-3">
                    <p className="text-[14px] font-semibold text-ghost">{item.title}</p>
                    <Pill tone={item.readAt ? "neutral" : "info"}>{item.type}</Pill>
                    {!item.readAt ? <span className="h-2 w-2 rounded-full bg-accent-blue" aria-label="unread" /> : null}
                  </div>
                  <p className="mt-1.5 text-[12.5px] leading-relaxed text-ghost-dim">{item.message}</p>
                  <p className="mt-2 text-[11.5px] text-ghost-muted">
                    {formatDate(item.createdAt)} · {formatTime(item.createdAt)}
                  </p>
                </div>
                {!item.readAt ? (
                  <button
                    onClick={() => markRead(item.id)}
                    disabled={pending}
                    className="inline-flex h-9 items-center rounded-pill border border-white/10 bg-white/6 px-3.5 text-[12px] font-semibold text-ghost hover:bg-white/12"
                  >
                    Mark read
                  </button>
                ) : null}
              </div>
            </li>
          );
        })}
        {!list.length ? (
          <li className="gf-hairline rounded-card bg-panel/70 p-8 text-center text-[12.5px] text-ghost-muted">
            You have no notifications yet.
          </li>
        ) : null}
      </ul>
    </div>
  );
}
