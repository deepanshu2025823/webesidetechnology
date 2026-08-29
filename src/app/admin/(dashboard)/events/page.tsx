import Link from "next/link";
import { CalendarDays, MapPin } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { saveEvent } from "@/app/admin/actions/events";
import { Badge, Card, EmptyState, PageHeader, inputClass } from "@/components/admin/ui";
import { formatDate, formatMoney } from "@/lib/utils";

const STAGE_TONE = { BRIEF: "muted", PLANNING: "neutral", PROMOTION: "warn", LIVE: "success", COMPLETED: "success", CANCELLED: "muted" } as const;
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

export default async function EventsPage() {
  const session = await requireModule("events");

  const [events, clients, owners] = await Promise.all([
    prisma.event.findMany({
      orderBy: { startDate: "desc" },
      include: {
        client: { select: { name: true } },
        owner: { select: { name: true } },
        _count: { select: { attendees: true, tasks: true, sponsors: true } },
      },
    }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const editable = canEdit(session.role, "events");

  return (
    <>
      <PageHeader title="Events" description="Event briefs, budgets, vendors, sponsors, registrations and post-event reporting." />

      {editable ? (
        <Card title="New event" className="mb-6">
          <form
            action={async (formData: FormData) => {
              "use server";
              await saveEvent({}, formData);
            }}
            className="grid gap-3 sm:grid-cols-12"
          >
            <input name="name" required placeholder="Event name" className={`${inputClass} sm:col-span-4`} />
            <input name="startDate" type="date" required className={`${inputClass} sm:col-span-2`} aria-label="Start date" />
            <input name="venue" placeholder="Venue" className={`${inputClass} sm:col-span-3`} />
            <input name="budget" type="number" min={0} placeholder="Budget ₹" className={`${inputClass} sm:col-span-3`} />
            <select name="clientId" defaultValue="" className={`${inputClass} sm:col-span-4`} aria-label="Client">
              <option value="">Own event (no client)</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <select name="ownerId" defaultValue="" className={`${inputClass} sm:col-span-3`} aria-label="Owner">
              <option value="">Me</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <input name="objectives" placeholder="Objectives" className={`${inputClass} sm:col-span-5`} />
            <button
              type="submit"
              className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-12"
            >
              Create event
            </button>
          </form>
        </Card>
      ) : null}

      {events.length === 0 ? (
        <EmptyState title="No events yet" description="Create an event to start planning promotion, vendors and registrations." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {events.map((event) => (
            <li key={event.id}>
              <Link
                href={`/admin/events/${event.id}`}
                className="flex h-full flex-col rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold-400/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium text-navy-900">{event.name}</p>
                  <Badge tone={STAGE_TONE[event.stage]}>{pretty(event.stage)}</Badge>
                </div>

                <p className="mt-1 text-xs text-slate-500">{event.client?.name ?? "Own event"}</p>

                <div className="mt-3 space-y-1 text-xs text-slate-500">
                  <p className="flex items-center gap-1.5">
                    <CalendarDays className="size-3.5" aria-hidden />
                    {formatDate(event.startDate)}
                  </p>
                  {event.venue ? (
                    <p className="flex items-center gap-1.5">
                      <MapPin className="size-3.5" aria-hidden />
                      {event.venue}
                    </p>
                  ) : null}
                </div>

                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 border-t border-navy-900/5 pt-3 text-xs text-slate-500">
                  <span>{event._count.attendees} registered</span>
                  <span>{event._count.tasks} tasks</span>
                  <span>{event._count.sponsors} sponsors</span>
                  {event.budget ? <span>{formatMoney(event.budget)}</span> : null}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
