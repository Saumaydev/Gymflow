import type { ReactNode } from "react";
import { NavShell, type NavShellUser } from "./NavShell";

export function AppShell({
  user,
  unread = 0,
  notificationHref,
  children,
}: {
  user: NavShellUser;
  unread?: number;
  notificationHref: string;
  children: ReactNode;
}) {
  return (
    <div className="relative min-h-screen w-full overflow-x-hidden">
      {/* Ambient arcs + soft light bleed (PRD §129) */}
      <div className="gf-ambient">
        <span
          className="gf-glow-blue"
          style={{ top: "-180px", right: "-120px" }}
        />
        <span
          className="gf-glow-purple"
          style={{ bottom: "-200px", left: "-140px" }}
        />
      </div>

      <NavShell
        user={user}
        unread={unread}
        notificationHref={notificationHref}
      />

      <main className="relative z-10 mx-auto w-full max-w-[1400px] px-4 pb-36 pt-2 lg:ml-[270px] lg:px-6 lg:pb-16">
        {children}
      </main>
    </div>
  );
}