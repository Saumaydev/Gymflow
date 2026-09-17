/* eslint-disable @next/next/no-img-element */
import type { ReactNode } from "react";
import { QrCode, ScanLine } from "lucide-react";
import { IconTile, Pill } from "@/components/ui/primitives";
import { pastelBg, pastelFor, type PastelKey } from "@/lib/tokens";

export type MemberPass = {
  name: string;
  memberCode: string;
  planName?: string | null;
  status?: string | null;
  meta?: ReactNode;
};

/** Renders the scannable member pass. Works inside server and client trees. */
export function MemberPassCard({
  pass,
  accent,
  className = "",
  caption = "Show this at the entrance — the front desk or your trainer scans it to check you in.",
}: {
  pass: MemberPass;
  accent?: PastelKey;
  className?: string;
  caption?: string;
}) {
  const tone = accent ?? pastelFor(pass.memberCode);

  return (
    <div className={className}>
      <div className="flex flex-col items-center gap-5 sm:flex-row sm:items-start">
        {/* QR surface — kept light and high contrast for reliable scanning */}
        <div className="flex flex-col items-center gap-3">
          <div className="rounded-card border border-pastel-ink/10 bg-white p-4 shadow-float">
            <img
              src={`/api/qr?code=${encodeURIComponent(pass.memberCode)}`}
              alt={`Check-in QR code for ${pass.name} (${pass.memberCode})`}
              width={188}
              height={188}
              className="h-[168px] w-[168px] bg-white sm:h-[188px] sm:w-[188px]"
            />
          </div>
          <p className="gf-num text-[13px] font-semibold tracking-[0.18em] text-ghost-muted">{pass.memberCode}</p>
        </div>

        <div className="min-w-0 flex-1 text-center sm:text-left">
          <div className="flex flex-col items-center gap-3 sm:flex-row sm:items-center">
            <IconTile accent={tone}>
              <QrCode size={16} />
            </IconTile>
            <div className="min-w-0">
              <p className="truncate text-[15px] font-semibold text-ghost">{pass.name}</p>
              <p className="truncate text-[12px] text-ghost-muted">{pass.planName ?? "Member pass"}</p>
            </div>
          </div>

          <p className="mx-auto mt-4 max-w-sm text-[12.5px] leading-relaxed text-ghost-dim sm:mx-0">{caption}</p>

          <div className="mt-4 flex flex-wrap items-center justify-center gap-2 sm:justify-start">
            <Pill tone="info">
              <ScanLine size={11} /> QR · App · Manual
            </Pill>
            {pass.status ? <Pill tone={pass.status === "ACTIVE" ? "positive" : "warning"}>{pass.status}</Pill> : null}
          </div>

          {pass.meta ? <div className="mt-4">{pass.meta}</div> : null}
        </div>
      </div>
    </div>
  );
}

/** Compact inline pass used in dense admin tables/detail pages. */
export function MemberPassMini({ name, memberCode }: { name: string; memberCode: string }) {
  const tone = pastelFor(memberCode);
  return (
    <div className="flex items-center gap-4 rounded-card border border-white/7 bg-white/4 p-4">
      <span className="rounded-card bg-white p-2.5">
        <img
          src={`/api/qr?code=${encodeURIComponent(memberCode)}`}
          alt={`Check-in QR for ${name}`}
          width={96}
          height={96}
          className="h-20 w-20"
        />
      </span>
      <div className="min-w-0">
        <p className="truncate text-[13px] font-semibold text-ghost">{name}</p>
        <p className="gf-num mt-0.5 text-[11.5px] tracking-[0.16em] text-ghost-muted">{memberCode}</p>
        <span className={`${pastelBg[tone]} mt-2 inline-flex items-center gap-1.5 rounded-pill px-2.5 py-1 text-[10.5px] font-bold uppercase tracking-wide text-pastel-ink`}>
          <QrCode size={11} /> Scan at desk
        </span>
      </div>
    </div>
  );
}


