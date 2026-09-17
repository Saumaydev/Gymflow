import { CalendarX2, PartyPopper, Sparkles } from "lucide-react";
import { requireRole } from "@/lib/auth";
import { listEvents, listHolidays } from "@/lib/queries";
import { DarkPanel, EmptyState, IconTile, PastelCard, Pill, SectionHeading } from "@/components/ui/primitives";
import { formatDate, relativeDay } from "@/lib/format";
import { pastelFor, type PastelKey } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function MemberHolidaysPage() {
  const user = await requireRole("MEMBER");
  const [holidays, events] = await Promise.all([listHolidays(user.gymId), listEvents(user.gymId)]);
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcoming = holidays.filter((holiday) => holiday.date >= todayIso);
  const past = holidays.filter((holiday) => holiday.date < todayIso).slice(-3).reverse();
  const upcomingEvents = events.filter((event) => event.date >= todayIso);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Holidays & events</h1>
        <p className="mt-1 text-[13px] text-ghost-dim">Closures, workshops and challenges at {user.gym.name}</p>
      </div>

      {upcoming[0] ? (
        <PastelCard accent="blush" hero className="flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-5">
            <span className="gf-num flex h-20 w-20 flex-col items-center justify-center rounded-card bg-white/70 leading-none">
              <span className="text-[24px] font-semibold">{upcoming[0].date.slice(8)}</span>
              <span className="text-[11px] font-semibold uppercase">
                {new Date(upcoming[0].date).toLocaleString("en-IN", { month: "short", timeZone: "Asia/Kolkata" })}
              </span>
            </span>
            <div>
              <p className="text-[12px] font-semibold uppercase tracking-[0.14em] text-pastel-ink/50">Gym holiday</p>
              <p className="mt-1.5 text-[22px] font-semibold leading-tight">{upcoming[0].title}</p>
              <p className="mt-1 text-[12.5px] text-pastel-ink/65">{upcoming[0].description ?? "Gym is closed today."}</p>
            </div>
          </div>
          <Pill>{relativeDay(upcoming[0].date)}</Pill>
        </PastelCard>
      ) : (
        <EmptyState icon={<CalendarX2 size={22} />} title="No upcoming holidays" message="The gym is open on all scheduled days right now." />
      )}

      <div className="grid gap-5 xl:grid-cols-[1fr_1.2fr]">
        <DarkPanel>
          <SectionHeading title="Closure calendar" caption="Upcoming and recent gym holidays" />
          <ul className="mt-4 space-y-3">
            {upcoming.slice(1).map((holiday) => (
              <li key={holiday.id} className="flex items-center justify-between rounded-card border border-white/7 bg-white/4 px-4 py-3">
                <div>
                  <p className="text-[13px] font-semibold text-ghost">{holiday.title}</p>
                  <p className="text-[11.5px] text-ghost-muted">{formatDate(holiday.date)}</p>
                </div>
                <Pill tone="neutral">{relativeDay(holiday.date)}</Pill>
              </li>
            ))}
            {past.map((holiday) => (
              <li key={`past-${holiday.id}`} className="flex items-center justify-between rounded-card border border-white/7 bg-white/4 px-4 py-3 opacity-70">
                <div>
                  <p className="text-[13px] font-semibold text-ghost">{holiday.title}</p>
                  <p className="text-[11.5px] text-ghost-muted">{formatDate(holiday.date)}</p>
                </div>
                <Pill tone="neutral">Closed</Pill>
              </li>
            ))}
            {!upcoming.length && !past.length ? <li className="text-[12.5px] text-ghost-muted">No closures on record.</li> : null}
          </ul>
          <p className="mt-4 text-[11.5px] text-ghost-muted">
            Memberships are automatically extended for every published closure.
          </p>
        </DarkPanel>

        <div className="space-y-4">
          <SectionHeading title="Events you can join" caption="Workshops, competitions and challenges" />
          <div className="grid gap-4 sm:grid-cols-2">
            {upcomingEvents.map((event, index) => (
              <PastelCard key={event.id} accent={pastelFor(index + 1) as PastelKey}>
                <IconTile accent="dark" size="sm" className="bg-white/60 text-pastel-ink">
                  <PartyPopper size={14} />
                </IconTile>
                <p className="mt-4 text-[15px] font-semibold">{event.title}</p>
                <p className="mt-1 text-[11.5px] font-semibold text-pastel-ink/60">
                  {formatDate(event.date)} · {event.eventType}
                </p>
                <p className="mt-2 text-[11.5px] text-pastel-ink/60">{event.description}</p>
                <Pill className="mt-3">{event.capacity} spots</Pill>
              </PastelCard>
            ))}
            {!upcomingEvents.length ? (
              <div className="rounded-card border border-white/7 bg-white/4 p-5 text-[12.5px] text-ghost-muted">
                New events will appear here as soon as the gym publishes them.
              </div>
            ) : null}
          </div>
          <div className="flex items-start gap-3 rounded-card border border-white/7 bg-white/4 p-4">
            <IconTile accent="cream" size="sm">
              <Sparkles size={14} />
            </IconTile>
            <p className="text-[11.5px] text-ghost-muted">
              Event invites land in your notification centre — {user.name.split(" ")[0]}, keep an eye out for weekend workshops.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
