import { notFound } from "next/navigation";
import { CalendarRange, Dumbbell, PartyPopper, Sunrise, Sunset } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { getTrainerDashboard, listEvents } from "@/lib/queries";
import { DarkPanel, IconTile, KeyValue, PastelCard, Pill, SectionHeading } from "@/components/ui/primitives";
import { formatDate, formatTime, relativeDay } from "@/lib/format";
import { pastelFor, type PastelKey } from "@/lib/tokens";

export const dynamic = "force-dynamic";

const SLOTS = [
  { label: "Early strength", window: "6:00 – 9:00 AM", focus: "Powerlifting & compound work", icon: Sunrise },
  { label: "Midday mobility", window: "11:00 AM – 1:00 PM", focus: "Mobility, rehab and core", icon: Dumbbell },
  { label: "Evening conditioning", window: "5:00 – 8:00 PM", focus: "Metcon, classes and PT", icon: Sunset },
];

export default async function TrainerSchedulePage() {
  const user = await requireRole("TRAINER");
  if (!user.trainer) notFound();
  const [data, events] = await Promise.all([
    getTrainerDashboard(user.gymId, user.trainer.id, user.id),
    listEvents(user.gymId),
  ]);
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcomingEvents = events.filter((event) => event.date >= todayIso);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Schedule</h1>
        <p className="mt-1 text-[13px] text-ghost-dim">Shift blocks, member load and upcoming gym events</p>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.2fr_1fr]">
        <div className="space-y-4">
          {SLOTS.map((slot, index) => (
            <DarkPanel key={slot.label}>
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  <IconTile accent={pastelFor(index) as PastelKey}>
                    <slot.icon size={16} />
                  </IconTile>
                  <div>
                    <p className="text-[15px] font-semibold text-ghost">{slot.label}</p>
                    <p className="mt-1 text-[12.5px] text-ghost-dim">{slot.focus}</p>
                    <p className="mt-1 text-[11.5px] text-ghost-muted">{slot.window}</p>
                  </div>
                </div>
                <Pill tone={index === 2 ? "warning" : "info"}>{index === 2 ? "Busiest" : "Scheduled"}</Pill>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-3">
                <KeyValue label="Assigned" value={`${Math.round(data.stats.assigned / 3)} members`} />
                <KeyValue label="Room" value={index === 1 ? "Studio 2" : "Main floor"} />
                <KeyValue label="Focus" value={index === 0 ? "Strength" : index === 1 ? "Recovery" : "Conditioning"} />
              </div>
            </DarkPanel>
          ))}
        </div>

        <div className="space-y-5">
          <PastelCard accent="lavender" hero>
            <IconTile accent="dark" size="sm" className="bg-white/60 text-pastel-ink">
              <CalendarRange size={14} />
            </IconTile>
            <p className="mt-4 text-[12px] font-semibold uppercase tracking-[0.14em] text-pastel-ink/50">Today</p>
            <p className="mt-2 text-[20px] font-semibold leading-tight">{formatDate(new Date().toISOString())}</p>
            <p className="mt-1 text-[12.5px] text-pastel-ink/65">
              {data.roster.filter((member) => member.present_today).length} of {data.roster.length} members checked in.
            </p>
            <div className="mt-4 rounded-card bg-white/60 p-4">
              <p className="text-[12px] font-semibold text-pastel-ink/60">Next member session</p>
              <p className="mt-1 text-[15px] font-semibold">
                {data.roster.find((member) => !member.present_today)?.name ?? "All caught up"}
              </p>
            </div>
          </PastelCard>

          <DarkPanel>
            <SectionHeading title="Upcoming gym events" caption="Programming you may coach" />
            <ul className="mt-4 space-y-3">
              {upcomingEvents.map((event, index) => (
                <li key={event.id} className="rounded-card border border-white/7 bg-white/4 p-4">
                  <div className="flex items-start justify-between">
                    <IconTile accent={pastelFor(index + 3) as PastelKey} size="sm">
                      <PartyPopper size={14} />
                    </IconTile>
                    <Pill tone="info">{event.eventType}</Pill>
                  </div>
                  <p className="mt-3 text-[13px] font-semibold text-ghost">{event.title}</p>
                  <p className="mt-1 text-[11.5px] text-ghost-muted">
                    {formatDate(event.date)} · {relativeDay(event.date)}
                  </p>
                </li>
              ))}
              {!upcomingEvents.length ? <li className="text-[12.5px] text-ghost-muted">No events scheduled.</li> : null}
            </ul>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Last own check-in" caption="Attendance log" />
            <div className="mt-4 space-y-3">
              {data.own.slice(0, 3).map((row) => (
                <div key={row.id} className="flex items-center justify-between text-[12.5px]">
                  <span className="text-ghost-dim">{formatDate(row.date)}</span>
                  <span className="text-ghost-muted">{row.checkIn ? formatTime(row.checkIn) : "—"}</span>
                  <Pill tone={row.status === "LATE" ? "warning" : "positive"}>{row.status}</Pill>
                </div>
              ))}
              {!data.own.length ? <p className="text-[12.5px] text-ghost-muted">No check-ins yet.</p> : null}
            </div>
          </DarkPanel>
        </div>
      </div>
    </div>
  );
}
