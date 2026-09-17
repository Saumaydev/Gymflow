"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Bell,
  ChevronDown,
  Command,
  Dumbbell,
  LogOut,
  Plus,
  Search,
  Settings,
  Shield,
  Sparkles,
  User,
  Users,
  X,
} from "lucide-react";
import { commandActions, mobileDock, quickActions, roleNav } from "@/lib/nav";
import { Avatar, IconTile } from "@/components/ui/primitives";

type Role = "ADMIN" | "TRAINER" | "MEMBER";

export type NavShellUser = {
  name: string;
  email: string;
  role: Role;
  gymName: string;
  subtitle: string;
};

const OPEN_PALETTE_EVENT = "gymflow:palette";
const EMPTY_HITS: SearchHits = { members: [], trainers: [], plans: [] };

export function openCommandPalette() {
  if (typeof window !== "undefined") window.dispatchEvent(new Event(OPEN_PALETTE_EVENT));
}

/* ------------------------------------------------------------------ */
/* Shell                                                              */
/* ------------------------------------------------------------------ */

export function NavShell({
  user,
  unread = 0,
  notificationHref,
}: {
  user: NavShellUser;
  unread?: number;
  notificationHref: string;
}) {
  const pathname = usePathname();
  const groups = roleNav[user.role];
  const dock = mobileDock[user.role];

  return (
    <>
      {/* Floating desktop navigation (PRD §83) */}
      <aside className="fixed left-4 top-4 z-40 hidden h-[calc(100vh-32px)] w-[254px] flex-col rounded-hero border border-white/7 bg-panel/75 p-4 shadow-panel backdrop-blur-2xl lg:flex">
        <div className="flex items-center gap-3 px-2 pb-4">
          <span className="gf-num flex h-11 w-11 items-center justify-center rounded-card bg-pastel-cyan text-[15px] font-semibold text-pastel-ink">
            GF
          </span>
          <div className="min-w-0">
            <p className="truncate text-[14px] font-semibold text-ghost">GymFlow</p>
            <p className="truncate text-[11.5px] text-ghost-muted">{user.gymName}</p>
          </div>
        </div>

        <button
          onClick={openCommandPalette}
          className="mb-4 flex h-11 w-full items-center gap-2.5 rounded-control border border-white/8 bg-white/5 px-3.5 text-left text-[12.5px] text-ghost-muted transition hover:bg-white/10"
        >
          <Search size={15} />
          <span className="flex-1">Search & actions</span>
          <span className="rounded-md border border-white/10 px-1.5 py-0.5 text-[10px]">⌘K</span>
        </button>

        <nav className="flex-1 space-y-5 overflow-y-auto pr-1" data-left-panel aria-label="Primary">
          {groups.map((group) => (
            <div key={group.title}>
              <p className="mb-2 px-2 text-[10.5px] font-semibold uppercase tracking-[0.18em] text-ghost-muted">{group.title}</p>
              <ul className="space-y-1">
                {group.items.map((item) => {
                  const active = pathname === item.href || (item.href !== "/admin" && item.href !== "/member" && item.href !== "/trainer" && pathname.startsWith(item.href));
                  return (
                    <li key={item.href}>
                      <Link
                        href={item.href}
                        prefetch
                        className={`group flex h-11 items-center gap-3 rounded-control px-3 text-[13px] font-medium transition ${
                          active ? "bg-ghost text-pastel-ink" : "text-ghost-dim hover:bg-white/8 hover:text-ghost"
                        }`}
                      >
                        <item.icon size={17} strokeWidth={1.7} />
                        <span className="truncate">{item.label}</span>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </nav>

        <div className="mt-4 rounded-card border border-white/7 bg-white/4 p-3.5">
          <div className="flex items-center gap-2 text-[11.5px] font-semibold text-ghost">
            <Sparkles size={14} className="text-accent-purple" />
            {user.role === "ADMIN" ? "Smart insights active" : "Coaching mode"}
          </div>
          <p className="mt-1.5 text-[11.5px] leading-relaxed text-ghost-muted">{user.subtitle}</p>
        </div>
      </aside>

      {/* Topbar (PRD §19, §85) */}
      <Topbar user={user} unread={unread} notificationHref={notificationHref} />

      {/* Floating mobile dock (PRD §84) */}
      <nav
        className="fixed bottom-4 left-1/2 z-40 flex w-[min(94vw,340px)] -translate-x-1/2 items-center justify-between gap-1 rounded-card border border-white/8 bg-panel/85 p-1.5 shadow-panel backdrop-blur-2xl lg:hidden"
        aria-label="Mobile"
      >
        {dock.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              prefetch
              className={`flex h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-control text-[9.5px] font-semibold transition ${
                active ? "bg-ghost text-pastel-ink" : "text-ghost-muted hover:text-ghost"
              }`}
            >
              <item.icon size={17} strokeWidth={1.7} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <QuickAction role={user.role} />
      <CommandPalette role={user.role} />
    </>
  );
}

/* ------------------------------------------------------------------ */
/* Topbar                                                             */
/* ------------------------------------------------------------------ */

function Topbar({ user, unread, notificationHref }: { user: NavShellUser; unread: number; notificationHref: string }) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-30 mb-2 flex items-center justify-between gap-3 rounded-b-card border-b border-white/6 bg-canvas-dark/70 px-4 py-3 backdrop-blur-xl lg:ml-[270px] lg:border-0 lg:bg-transparent lg:px-6 lg:py-4 lg:backdrop-blur-none relative">
      <div className="flex items-center gap-3 lg:hidden">
        <span className="gf-num flex h-10 w-10 items-center justify-center rounded-card bg-pastel-cyan text-[13px] font-semibold text-pastel-ink">
          GF
        </span>
        <div className="leading-tight">
          <p className="text-[13px] font-semibold text-ghost">GymFlow</p>
          <p className="text-[10.5px] text-ghost-muted">{user.gymName}</p>
        </div>
      </div>

      <div className="hidden items-center gap-2 lg:flex">
        <p className="text-[12.5px] text-ghost-muted">
          {user.role === "ADMIN" ? "Owner console" : user.role === "TRAINER" ? "Coach console" : "Member app"}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        <Link
          href={notificationHref}
          className="relative flex h-11 w-11 items-center justify-center rounded-full border border-white/8 bg-white/5 text-ghost-dim transition hover:bg-white/10 hover:text-ghost"
          aria-label="Notifications"
        >
          <Bell size={17} strokeWidth={1.7} />
          {unread > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-pastel-blush px-1 text-[10px] font-bold text-pastel-ink">
              {unread > 9 ? "9+" : unread}
            </span>
          ) : null}
        </Link>

        <button
          onClick={() => setMenuOpen((prev) => !prev)}
          className="flex items-center gap-2 rounded-pill border border-white/8 bg-white/5 py-1.5 pl-1.5 pr-3 transition hover:bg-white/10"
          aria-haspopup="menu"
          aria-expanded={menuOpen}
        >
          <IconTile accent="lavender" size="sm">
            <User size={15} />
          </IconTile>
          <span className="hidden text-[12.5px] font-semibold text-ghost sm:block">{user.name.split(" ")[0]}</span>
          <ChevronDown size={14} className="text-ghost-muted" />
        </button>

        {menuOpen ? (
          <div
            className="absolute right-4 top-[70px] z-50 w-[248px] animate-[fade-up_.3s_cubic-bezier(.22,1,.36,1)] rounded-card border border-white/8 bg-panel/95 p-2 shadow-lift backdrop-blur-2xl"
            role="menu"
          >
            <div className="flex items-center gap-3 px-3 py-3">
              <Avatar name={user.name} size={40} />
              <div className="min-w-0">
                <p className="truncate text-[13px] font-semibold text-ghost">{user.name}</p>
                <p className="truncate text-[11px] text-ghost-muted">{user.email}</p>
              </div>
            </div>
            <div className="my-1 h-px bg-white/6" />
            {[
              { label: "Profile", href: user.role === "ADMIN" ? "/admin/settings" : user.role === "TRAINER" ? "/trainer/profile" : "/member/profile", icon: User },
              { label: "Gym settings", href: "/admin/settings", icon: Settings },
              { label: "Security", href: "/admin/settings?tab=security", icon: Shield },
            ].map((item) => (
              <Link
                key={item.label}
                href={item.href}
                onClick={() => setMenuOpen(false)}
                className="flex h-10 items-center gap-3 rounded-control px-3 text-[12.5px] text-ghost-dim transition hover:bg-white/8 hover:text-ghost"
                role="menuitem"
              >
                <item.icon size={15} strokeWidth={1.7} />
                {item.label}
              </Link>
            ))}
            <div className="my-1 h-px bg-white/6" />
            <form action="/api/auth/logout" method="post">
              <button
                type="submit"
                className="flex h-10 w-full items-center gap-3 rounded-control px-3 text-left text-[12.5px] text-pastel-blush transition hover:bg-pastel-blush/12"
                role="menuitem"
              >
                <LogOut size={15} strokeWidth={1.7} />
                Logout
              </button>
            </form>
          </div>
        ) : null}
      </div>
    </header>
  );
}

/* ------------------------------------------------------------------ */
/* Quick action expansion (PRD §77)                                    */
/* ------------------------------------------------------------------ */

function QuickAction({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const actions = quickActions[role];

  return (
    <div className="fixed bottom-24 left-1/2 z-40 -translate-x-1/2 lg:bottom-8 lg:left-auto lg:right-8 lg:translate-x-0">
      {open ? (
        <div className="mb-3 flex w-[236px] animate-[fade-up_.28s_cubic-bezier(.22,1,.36,1)] flex-col gap-2 rounded-card border border-white/8 bg-panel/92 p-2 shadow-lift backdrop-blur-2xl">
          {actions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              onClick={() => setOpen(false)}
              className="flex h-11 items-center gap-3 rounded-control px-3 text-[12.5px] font-medium text-ghost-dim transition hover:bg-white/8 hover:text-ghost"
            >
              <action.icon size={16} strokeWidth={1.7} />
              {action.label}
            </Link>
          ))}
        </div>
      ) : null}
      <button
        onClick={() => setOpen((prev) => !prev)}
        aria-expanded={open}
        aria-label="Quick actions"
        className="ml-auto flex h-14 w-14 items-center justify-center rounded-full bg-ghost text-pastel-ink shadow-lift transition active:scale-95"
      >
        {open ? <X size={20} /> : <Plus size={22} />}
      </button>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/* Command palette (PRD §76)                                          */
/* ------------------------------------------------------------------ */

type SearchHits = {
  members: { id: number; name: string; code: string }[];
  trainers: { id: number; name: string; specialization: string | null }[];
  plans: { id: number; name: string; price: number }[];
};

function CommandPalette({ role }: { role: Role }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [hits, setHits] = useState<SearchHits>(EMPTY_HITS);
  const actions = commandActions[role];
  const router = useRouter();

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen((prev) => !prev);
      }
      if (event.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    document.addEventListener("keydown", onKey);
    window.addEventListener(OPEN_PALETTE_EVENT, onOpen);
    return () => {
      document.removeEventListener("keydown", onKey);
      window.removeEventListener(OPEN_PALETTE_EVENT, onOpen);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const term = query.trim();
    const handle = window.setTimeout(async () => {
      if (term.length < 2) {
        setHits(EMPTY_HITS);
        return;
      }
      try {
        const response = await fetch(`/api/search?q=${encodeURIComponent(term)}`);
        if (!response.ok) return;
        const data = (await response.json()) as SearchHits;
        setHits(data);
      } catch {
        /* offline-safe */
      }
    }, 220);
    return () => window.clearTimeout(handle);
  }, [query, open]);

  const filteredActions = useMemo(
    () => actions.filter((action) => action.label.toLowerCase().includes(query.toLowerCase())),
    [actions, query],
  );

  if (!open) return null;

  const go = (href: string) => {
    setOpen(false);
    setQuery("");
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-[80] flex items-start justify-center px-4 pt-[12vh]">
      <button className="absolute inset-0 bg-black/55 backdrop-blur-md" onClick={() => setOpen(false)} aria-label="Close search" />
      <div className="relative w-full max-w-2xl animate-[fade-up_.35s_cubic-bezier(.22,1,.36,1)] rounded-hero border border-white/8 bg-panel/92 p-2 shadow-lift backdrop-blur-2xl">
        <div className="flex items-center gap-3 px-4 py-3">
          <Command size={17} className="text-ghost-muted" />
          <input
            autoFocus
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search members, receipts, plans — or type an action"
            className="h-10 flex-1 bg-transparent text-[14px] text-ghost placeholder:text-ghost-muted focus:outline-none"
            aria-label="Command palette search"
          />
          <span className="rounded-md border border-white/10 px-2 py-0.5 text-[10px] text-ghost-muted">ESC</span>
        </div>
        <div className="max-h-[52vh] overflow-y-auto rounded-card bg-black/15 p-2" data-left-panel>
          <PaletteGroup title="Actions">
            {filteredActions.map((action) => (
              <PaletteRow key={action.label} onClick={() => go(action.href)} icon={<action.icon size={15} />} title={action.label} subtitle={action.hint} />
            ))}
            {!filteredActions.length ? <p className="px-3 py-2 text-[12px] text-ghost-muted">No matching action</p> : null}
          </PaletteGroup>

          {hits.members.length ? (
            <PaletteGroup title="Members">
              {hits.members.map((m) => (
                <PaletteRow key={m.id} onClick={() => go(role === "ADMIN" ? `/admin/members/${m.id}` : "/member")} icon={<Users size={15} />} title={m.name} subtitle={m.code} />
              ))}
            </PaletteGroup>
          ) : null}

          {hits.trainers.length ? (
            <PaletteGroup title="Trainers">
              {hits.trainers.map((t) => (
                <PaletteRow key={t.id} onClick={() => go(`/admin/trainers/${t.id}`)} icon={<Dumbbell size={15} />} title={t.name} subtitle={t.specialization ?? "Coach"} />
              ))}
            </PaletteGroup>
          ) : null}

          {hits.plans.length ? (
            <PaletteGroup title="Plans">
              {hits.plans.map((p) => (
                <PaletteRow key={p.id} onClick={() => go("/admin/memberships")} icon={<Sparkles size={15} />} title={p.name} subtitle={`₹${p.price}/cycle`} />
              ))}
            </PaletteGroup>
          ) : null}

          {!filteredActions.length && !hits.members.length && !hits.trainers.length && !hits.plans.length ? (
            <p className="px-3 py-6 text-center text-[12.5px] text-ghost-muted">
              Try “Rahul”, “Premium”, “Arjun” or an action like “Record Payment”.
            </p>
          ) : null}
        </div>
      </div>
    </div>
  );
}

function PaletteGroup({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="mb-1">
      <p className="px-3 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.16em] text-ghost-muted">{title}</p>
      <div className="space-y-0.5">{children}</div>
    </div>
  );
}

function PaletteRow({
  icon,
  title,
  subtitle,
  onClick,
}: {
  icon: React.ReactNode;
  title: string;
  subtitle?: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex w-full items-center gap-3 rounded-control px-3 py-2.5 text-left transition hover:bg-white/8"
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/8 text-ghost-dim">{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-ghost">{title}</span>
        {subtitle ? <span className="block truncate text-[11.5px] text-ghost-muted">{subtitle}</span> : null}
      </span>
    </button>
  );
}


