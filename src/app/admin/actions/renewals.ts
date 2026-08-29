"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity, requirePermission } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
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

export async function saveRenewal(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("renewals", "write");
  const id = str(form, "id");
  const name = str(form, "name");
  const clientId = str(form, "clientId");
  const expiry = date(form, "expiryDate");

  if (!clientId) return { error: "Pick the client this renewal belongs to." };
  if (!name) return { error: "Give the renewal a name." };
  if (!expiry) return { error: "Set the expiry date." };

  const days = str(form, "reminderDays")
    .split(",")
    .map((d) => Number(d.trim()))
    .filter((d) => Number.isFinite(d) && d > 0)
    .sort((a, b) => b - a);

  const balanceRaw = str(form, "balance");
  const thresholdRaw = str(form, "balanceThreshold");

  const data = {
    clientId,
    projectId: nullable(form, "projectId"),
    type: (str(form, "type") || "DOMAIN") as never,
    name,
    provider: str(form, "provider"),
    identifier: str(form, "identifier"),
    startDate: date(form, "startDate"),
    expiryDate: expiry,
    amount: int(form, "amount"),
    status: (str(form, "status") || "ACTIVE") as never,
    autoRemind: form.get("autoRemind") === "on",
    // Falls back to the schedule in scope section 8.
    reminderDays: (days.length ? days : [90, 60, 30, 15, 7, 1]) as Prisma.InputJsonValue,
    balance: balanceRaw ? int(form, "balance") : null,
    balanceThreshold: thresholdRaw ? int(form, "balanceThreshold") : null,
    ownerId: nullable(form, "ownerId") ?? session.id,
    notes: str(form, "notes") || null,
  };

  try {
    if (id) await prisma.renewal.update({ where: { id }, data });
    else await prisma.renewal.create({ data });
  } catch (error) {
    console.error("[renewals] save", error);
    return { error: "Could not save this renewal." };
  }

  await logActivity(session.id, id ? "update" : "create", "Renewal", id || undefined, name);
  revalidatePath("/admin/renewals");
  return { ok: true, message: "Renewal saved." };
}

export async function deleteRenewal(id: string): Promise<void> {
  const session = await requirePermission("renewals", "write");
  await prisma.renewalEvent.deleteMany({ where: { renewalId: id } });
  await prisma.renewal.delete({ where: { id } });
  await logActivity(session.id, "delete", "Renewal", id);
  revalidatePath("/admin/renewals");
}

/** Rolls the expiry forward by one period and logs the event. */
export async function markRenewed(id: string, form: FormData): Promise<void> {
  const session = await requirePermission("renewals", "write");
  const months = Math.max(1, int(form, "months", 12));

  const renewal = await prisma.renewal.findUnique({ where: { id } });
  if (!renewal) return;

  const next = new Date(renewal.expiryDate);
  next.setMonth(next.getMonth() + months);

  await prisma.renewal.update({
    where: { id },
    data: { expiryDate: next, status: "ACTIVE", lastRemindedAt: null },
  });
  await prisma.renewalEvent.create({
    data: { renewalId: id, type: "RENEWED", note: `Extended by ${months} month(s) to ${next.toDateString()}` },
  });

  await logActivity(session.id, "update", "Renewal", id, `renewed for ${months} month(s)`);
  revalidatePath("/admin/renewals");
}

export async function markRenewalLost(id: string): Promise<void> {
  const session = await requirePermission("renewals", "write");
  await prisma.renewal.update({ where: { id }, data: { status: "LOST" } });
  await prisma.renewalEvent.create({ data: { renewalId: id, type: "LOST" } });
  await logActivity(session.id, "update", "Renewal", id, "marked lost");
  revalidatePath("/admin/renewals");
}

/** Raises an invoice for a renewal so billing and expiry stay in step. */
export async function invoiceRenewal(id: string): Promise<void> {
  const session = await requirePermission("finance", "write");

  const renewal = await prisma.renewal.findUnique({ where: { id }, include: { client: true } });
  if (!renewal) return;

  const year = new Date().getFullYear();
  const existing = await prisma.invoice.findMany({
    where: { number: { startsWith: `INV-${year}` } },
    select: { number: true },
  });
  const number = `INV-${year}-${String(existing.length + 1).padStart(4, "0")}`;

  const dueDate = new Date(renewal.expiryDate);

  const invoice = await prisma.invoice.create({
    data: {
      number,
      title: `${renewal.name} renewal`,
      clientId: renewal.clientId,
      renewalId: renewal.id,
      projectId: renewal.projectId,
      status: "DRAFT",
      issueDate: new Date(),
      dueDate,
      subtotal: renewal.amount,
      taxPct: 18,
      total: Math.round(renewal.amount * 1.18),
      ownerId: session.id,
      items: {
        create: {
          title: `${renewal.name} — ${renewal.provider || "renewal"}`,
          quantity: 1,
          unitPrice: renewal.amount,
          amount: renewal.amount,
          order: 0,
        },
      },
    },
  });

  await prisma.renewalEvent.create({
    data: { renewalId: id, type: "INVOICED", note: invoice.number },
  });

  await logActivity(session.id, "create", "Invoice", invoice.id, `${renewal.name} renewal`);
  revalidatePath("/admin/renewals");
  revalidatePath("/admin/finance");
}

/** Kept here so admin UI can trigger the same engine the scheduler runs. */
export async function runRenewalReminders() {
  await requirePermission("renewals", "write");
  const { renewalReminderSweep } = await import("@/lib/automation");
  const result = await renewalReminderSweep();
  revalidatePath("/admin/renewals");
  return result;
}
