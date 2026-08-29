"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { logActivity, requirePermission } from "@/lib/auth";
import type { ActionState } from "@/app/admin/actions/collections";

export type { ActionState };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string, fallback = 0) => {
  const raw = str(f, k).replace(/,/g, "");
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : fallback;
};
const date = (f: FormData, k: string) => {
  const raw = str(f, k);
  return raw ? new Date(raw) : null;
};
const nullable = (f: FormData, k: string) => str(f, k) || null;

export async function saveEvent(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("events", "write");
  const id = str(form, "id");
  const name = str(form, "name");
  const startDate = date(form, "startDate");

  if (!name) return { error: "Give the event a name." };
  if (!startDate) return { error: "Set the event date." };

  const data = {
    name,
    clientId: nullable(form, "clientId"),
    startDate,
    endDate: date(form, "endDate"),
    venue: str(form, "venue"),
    budget: int(form, "budget"),
    objectives: str(form, "objectives") || null,
    stage: (str(form, "stage") || "BRIEF") as never,
    ownerId: nullable(form, "ownerId") ?? session.id,
    report: str(form, "report") || null,
  };

  let eventId = id;
  if (id) {
    await prisma.event.update({ where: { id }, data });
  } else {
    const created = await prisma.event.create({ data });
    eventId = created.id;
  }

  await logActivity(session.id, id ? "update" : "create", "Event", eventId, name);
  revalidatePath("/admin/events");
  redirect(`/admin/events/${eventId}`);
}

export async function deleteEvent(id: string) {
  const session = await requirePermission("events", "write");
  await prisma.eventTask.deleteMany({ where: { eventId: id } });
  await prisma.eventVendor.deleteMany({ where: { eventId: id } });
  await prisma.eventSponsor.deleteMany({ where: { eventId: id } });
  await prisma.eventAttendee.deleteMany({ where: { eventId: id } });
  await prisma.event.delete({ where: { id } });
  await logActivity(session.id, "delete", "Event", id);
  revalidatePath("/admin/events");
  redirect("/admin/events");
}

export async function saveEventTask(eventId: string, form: FormData): Promise<void> {
  await requirePermission("events", "write");
  const title = str(form, "title");
  if (!title) return;

  await prisma.eventTask.create({
    data: {
      eventId,
      title,
      category: str(form, "category") || "Logistics",
      status: (str(form, "status") || "PLANNED") as never,
      assigneeId: nullable(form, "assigneeId"),
      dueDate: date(form, "dueDate"),
    },
  });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function setEventTaskStatus(id: string, status: string): Promise<void> {
  await requirePermission("events", "write");
  const task = await prisma.eventTask.findUnique({ where: { id }, select: { eventId: true } });
  await prisma.eventTask.update({ where: { id }, data: { status: status as never } });
  if (task) revalidatePath(`/admin/events/${task.eventId}`);
}

export async function saveEventVendor(eventId: string, form: FormData): Promise<void> {
  await requirePermission("events", "write");
  const name = str(form, "name");
  if (!name) return;

  await prisma.eventVendor.create({
    data: {
      eventId,
      name,
      service: str(form, "service"),
      contact: str(form, "contact"),
      quotedAmount: int(form, "quotedAmount"),
      paidAmount: int(form, "paidAmount"),
      status: (str(form, "status") || "PLANNED") as never,
    },
  });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function saveEventSponsor(eventId: string, form: FormData): Promise<void> {
  await requirePermission("events", "write");
  const name = str(form, "name");
  if (!name) return;

  await prisma.eventSponsor.create({
    data: {
      eventId,
      name,
      packageName: str(form, "packageName"),
      amount: int(form, "amount"),
      contact: str(form, "contact"),
      status: (str(form, "status") || "PLANNED") as never,
    },
  });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function saveEventAttendee(eventId: string, form: FormData): Promise<void> {
  await requirePermission("events", "write");
  const name = str(form, "name");
  if (!name) return;

  await prisma.eventAttendee.create({
    data: {
      eventId,
      name,
      email: str(form, "email"),
      phone: str(form, "phone"),
      company: str(form, "company"),
      status: (str(form, "status") || "REGISTERED") as never,
      source: str(form, "source") || "manual",
    },
  });
  revalidatePath(`/admin/events/${eventId}`);
}

export async function setAttendeeStatus(id: string, status: string): Promise<void> {
  await requirePermission("events", "write");
  const attendee = await prisma.eventAttendee.findUnique({ where: { id }, select: { eventId: true } });
  await prisma.eventAttendee.update({ where: { id }, data: { status: status as never } });
  if (attendee) revalidatePath(`/admin/events/${attendee.eventId}`);
}

/** Turns attendees into CRM leads so the follow-up actually happens. */
export async function captureAttendeeLeads(eventId: string): Promise<void> {
  const session = await requirePermission("leads", "write");

  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: { attendees: { where: { status: { in: ["ATTENDED", "CONFIRMED"] } } } },
  });
  if (!event) return;

  let created = 0;
  for (const attendee of event.attendees) {
    if (!attendee.email) continue;

    const exists = await prisma.enquiry.findFirst({ where: { email: attendee.email.toLowerCase() } });
    if (exists) continue;

    await prisma.enquiry.create({
      data: {
        name: attendee.name,
        email: attendee.email.toLowerCase(),
        phone: attendee.phone,
        company: attendee.company,
        message: `Met at ${event.name}.`,
        source: `event:${event.name}`,
        serviceInterest: "Event Marketing & Management",
        ownerId: event.ownerId ?? session.id,
        isRead: true,
      },
    });
    created += 1;
  }

  await logActivity(session.id, "create", "Enquiry", eventId, `${created} lead(s) captured from ${event.name}`);
  revalidatePath("/admin/leads");
  revalidatePath(`/admin/events/${eventId}`);
}
