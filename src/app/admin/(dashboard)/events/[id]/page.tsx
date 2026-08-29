import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, UserPlus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import {
  captureAttendeeLeads,
  saveEventAttendee,
  saveEventSponsor,
  saveEventTask,
  saveEventVendor,
} from "@/app/admin/actions/events";
import { EventTaskRow } from "@/components/admin/EventTaskRow";
import { AttendeeRow } from "@/components/admin/AttendeeRow";
import { Card, PageHeader, inputClass } from "@/components/admin/ui";
import { formatDate, formatMoney } from "@/lib/utils";

const CATEGORIES = ["Promotion", "Registrations", "Vendors", "Sponsors", "Speakers", "Logistics", "Execution"];
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

export default async function EventDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModule("events");
  const { id } = await params;

  const event = await prisma.event.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      owner: { select: { name: true } },
      tasks: { orderBy: { dueDate: "asc" }, include: { assignee: { select: { name: true } } } },
      vendors: true,
      sponsors: true,
      attendees: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!event) notFound();

  const assignees = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const editable = canEdit(session.role, "events");
  const vendorCost = event.vendors.reduce((sum, v) => sum + v.quotedAmount, 0);
  const sponsorValue = event.sponsors.reduce((sum, s) => sum + s.amount, 0);
  const attended = event.attendees.filter((a) => a.status === "ATTENDED").length;

  return (
    <>
      <Link href="/admin/events" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All events
      </Link>

      <PageHeader
        title={event.name}
        description={`${formatDate(event.startDate)}${event.venue ? ` · ${event.venue}` : ""}${event.client ? ` · ${event.client.name}` : ""}`}
        actions={
          editable && event.attendees.length ? (
            <form action={captureAttendeeLeads.bind(null, event.id)}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
              >
                <UserPlus className="size-4" aria-hidden /> Capture leads
              </button>
            </form>
          ) : null
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Stage", pretty(event.stage)],
          ["Budget", event.budget ? formatMoney(event.budget) : "—"],
          ["Vendor cost", formatMoney(vendorCost)],
          ["Sponsorship", formatMoney(sponsorValue)],
        ].map(([label, value]) => (
          <div key={label} className="rounded-2xl border border-navy-900/10 bg-white p-4">
            <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
            <p className="mt-1 font-medium text-navy-900">{value}</p>
          </div>
        ))}
      </div>

      <div className="space-y-6">
        <Card title="Task board" description="Promotion, registrations, vendors, logistics and execution.">
          {editable ? (
            <form action={saveEventTask.bind(null, event.id)} className="mb-4 grid gap-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4 sm:grid-cols-12">
              <input name="title" required placeholder="Task" className={`${inputClass} sm:col-span-5`} />
              <select name="category" defaultValue="Logistics" className={`${inputClass} sm:col-span-3`} aria-label="Category">
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
              <select name="assigneeId" defaultValue="" className={`${inputClass} sm:col-span-2`} aria-label="Assignee">
                <option value="">Assignee</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <input name="dueDate" type="date" className={`${inputClass} sm:col-span-2`} aria-label="Due date" />
              <button
                type="submit"
                className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-12"
              >
                Add task
              </button>
            </form>
          ) : null}

          {event.tasks.length ? (
            <ul className="divide-y divide-navy-900/5">
              {event.tasks.map((t) => (
                <EventTaskRow
                  key={t.id}
                  task={{
                    id: t.id,
                    title: t.title,
                    category: t.category,
                    status: t.status,
                    assignee: t.assignee?.name ?? null,
                    dueDate: t.dueDate ? t.dueDate.toISOString() : null,
                  }}
                  editable={editable}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No tasks yet.</p>
          )}
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Vendors">
            {editable ? (
              <form action={saveEventVendor.bind(null, event.id)} className="mb-4 grid gap-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4 sm:grid-cols-2">
                <input name="name" required placeholder="Vendor name" className={inputClass} />
                <input name="service" placeholder="Service" className={inputClass} />
                <input name="quotedAmount" type="number" min={0} placeholder="Quoted ₹" className={inputClass} />
                <input name="paidAmount" type="number" min={0} placeholder="Paid ₹" className={inputClass} />
                <button type="submit" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-2">
                  Add vendor
                </button>
              </form>
            ) : null}

            {event.vendors.length ? (
              <ul className="divide-y divide-navy-900/5">
                {event.vendors.map((v) => (
                  <li key={v.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-navy-900">{v.name}</span>
                      <span className="block text-xs text-slate-500">{v.service}</span>
                    </span>
                    <span className="text-right text-xs">
                      <span className="block text-navy-900">{formatMoney(v.quotedAmount)}</span>
                      <span className="block text-slate-400">paid {formatMoney(v.paidAmount)}</span>
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No vendors yet.</p>
            )}
          </Card>

          <Card title="Sponsors">
            {editable ? (
              <form action={saveEventSponsor.bind(null, event.id)} className="mb-4 grid gap-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4 sm:grid-cols-2">
                <input name="name" required placeholder="Sponsor name" className={inputClass} />
                <input name="packageName" placeholder="Package" className={inputClass} />
                <input name="amount" type="number" min={0} placeholder="Amount ₹" className={inputClass} />
                <input name="contact" placeholder="Contact" className={inputClass} />
                <button type="submit" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-2">
                  Add sponsor
                </button>
              </form>
            ) : null}

            {event.sponsors.length ? (
              <ul className="divide-y divide-navy-900/5">
                {event.sponsors.map((s) => (
                  <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
                    <span className="min-w-0 flex-1">
                      <span className="block font-medium text-navy-900">{s.name}</span>
                      <span className="block text-xs text-slate-500">{s.packageName}</span>
                    </span>
                    <span className="text-sm font-medium text-navy-900">{formatMoney(s.amount)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No sponsors yet.</p>
            )}
          </Card>
        </div>

        <Card title="Registrations" description={`${event.attendees.length} registered · ${attended} attended`}>
          {editable ? (
            <form action={saveEventAttendee.bind(null, event.id)} className="mb-4 grid gap-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4 sm:grid-cols-12">
              <input name="name" required placeholder="Name" className={`${inputClass} sm:col-span-3`} />
              <input name="email" type="email" placeholder="Email" className={`${inputClass} sm:col-span-3`} />
              <input name="phone" placeholder="Phone" className={`${inputClass} sm:col-span-2`} />
              <input name="company" placeholder="Company" className={`${inputClass} sm:col-span-2`} />
              <button type="submit" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-2">
                Add
              </button>
            </form>
          ) : null}

          {event.attendees.length ? (
            <ul className="divide-y divide-navy-900/5">
              {event.attendees.map((a) => (
                <AttendeeRow
                  key={a.id}
                  attendee={{
                    id: a.id,
                    name: a.name,
                    email: a.email,
                    company: a.company,
                    status: a.status,
                  }}
                  editable={editable}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No registrations yet.</p>
          )}
        </Card>
      </div>
    </>
  );
}
