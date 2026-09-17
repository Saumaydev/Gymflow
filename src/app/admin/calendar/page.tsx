import { CalendarDays, CalendarPlus, Gift, PartyPopper, Sparkles } from "lucide-react";
import { requireAdmin } from "@/lib/auth";
import { listEvents, listHolidays } from "@/lib/queries";
import { DarkPanel, EmptyState, IconTile, KeyValue, PastelCard, Pill, SectionHeading } from "@/components/ui/primitives";
import { CalendarComposer } from "@/components/admin/forms";
import { formatDate, formatMonthDay, relativeDay } from "@/lib/format";
import { pastelFor, type PastelKey } from "@/lib/tokens";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
  const admin = await requireAdmin();
  const [holidays, events] = await Promise.all([listHolidays(admin.gymId), listEvents(admin.gymId)]);
  const todayIso = new Date().toISOString().slice(0, 10);
  const upcomingHolidays = holidays.filter((holiday) => holiday.date >= todayIso);
  const pastHolidays = holidays.filter((holiday) => holiday.date < todayIso);
  const upcomingEvents = events.filter((event) => event.date >= todayIso);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-[26px] font-semibold tracking-tight text-ghost sm:text-[30px]">Gym calendar</h1>
          <p className="mt-1 text-[13px] text-ghost-dim">Holidays, events and challenges — members are notified automatically</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <CalendarComposer defaultKind="holiday" />
          <CalendarComposer defaultKind="event" />
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.3fr_1fr]">
        <DarkPanel>
          <SectionHeading title="Upcoming holidays" caption={`${upcomingHolidays.length} scheduled closures`} />
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            {upcomingHolidays.map((holiday, index) => (
              <PastelCard key={holiday.id} accent={pastelFor(index) as PastelKey} className="p-5">
                <div className="flex items-start justify-between">
                  <IconTile accent="dark" size="sm" className="bg-white/60 text-pastel-ink">
                    <CalendarDays size={14} />
                  </IconTile>
                  <Pill>{relativeDay(holiday.date)}</Pill>
                </div>
                <p className="gf-num mt-4 text-[22px] font-semibold leading-none">{formatMonthDay(holiday.date)}</p>
                <p className="mt-1.5 text-[14px] font-semibold">{holiday.title}</p>
                <p className="mt-1 text-[11.5px] text-pastel-ink/60">{holiday.description ?? "Gym closed."}</p>
              </PastelCard>
            ))}
            {!upcomingHolidays.length ? (
              <EmptyState icon={<CalendarPlus size={22} />} title="No upcoming holidays" message="Add closures so members plan their training week." />
            ) : null}
          </div>

          <div className="mt-6">
            <SectionHeading title="Past closures" caption="History of gym shutdowns" />
            <ul className="mt-4 space-y-2.5">
              {pastHolidays.map((holiday) => (
                <li key={holiday.id} className="flex items-center justify-between rounded-card border border-white/7 bg-white/4 px-4 py-3">
                  <span className="text-[12.5px] text-ghost-dim">
                    {formatDate(holiday.date)} · {holiday.title}
                  </span>
                  <Pill tone="neutral">{relativeDay(holiday.date)}</Pill>
                </li>
              ))}
              {!pastHolidays.length ? <li className="text-[12.5px] text-ghost-muted">No past closures on record.</li> : null}
            </ul>
          </div>
        </DarkPanel>

        <div className="space-y-5">
          <DarkPanel>
            <SectionHeading title="Events & challenges" caption="Optional programming members can join" />
            <div className="mt-4 space-y-3">
              {upcomingEvents.map((event, index) => (
                <div key={event.id} className="rounded-card border border-white/7 bg-white/4 p-4">
                  <div className="flex items-start justify-between">
                    <IconTile accent={pastelFor(index + 2) as PastelKey} size="sm">
                      <PartyPopper size={14} />
                    </IconTile>
                    <Pill tone="info">{event.eventType}</Pill>
                  </div>
                  <p className="mt-3 text-[14px] font-semibold text-ghost">{event.title}</p>
                  <p className="mt-1 text-[11.5px] text-ghost-muted">
                    {formatDate(event.date)} · {relativeDay(event.date)} · capacity {event.capacity}
                  </p>
                  <p className="mt-2 text-[12px] text-ghost-dim">{event.description}</p>
                </div>
              ))}
              {!upcomingEvents.length ? <p className="text-[12.5px] text-ghost-muted">No events scheduled.</p> : null}
            </div>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Operating pattern" caption="Gym hours and closure policy" />
            <div className="mt-4 space-y-4">
              <KeyValue label="Opening hours" value={admin.gym.openingHours ?? "—"} />
              <KeyValue label="Closures per year" value={String(holidays.length + 6)} />
              <KeyValue label="Auto extensions" value="Membership extended by one day per closure" />
            </div>
            <div className="mt-4 flex items-start gap-3 rounded-card bg-pastel-lavender p-4 text-pastel-ink">
              <Sparkles size={16} />
              <p className="text-[12px] font-semibold">
                Publishing a holiday instantly notifies every member and appears in the member app calendar.
              </p>
            </div>
          </DarkPanel>

          <DarkPanel>
            <SectionHeading title="Community moments" caption="Suggested programming" />
            <div className="mt-4 flex flex-wrap gap-2">
              {["Fitness competition", "Strength workshop", "Group class series", "30 day challenge", "Community run"].map((idea) => (
                <span key={idea} className="rounded-pill border border-white/8 bg-white/5 px-3 py-1.5 text-[11.5px] text-ghost-dim">
                  <Gift size={11} className="mr-1 inline" />
                  {idea}
                </span>
              ))}
            </div>
          </DarkPanel>
        </div>
      </div>
    </div>
  );
}
