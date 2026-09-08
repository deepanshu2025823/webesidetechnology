"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { logActivity, requirePermission } from "@/lib/auth";
import { alertPaymentRecorded } from "@/lib/alerts";
import { toBillingCycle } from "@/lib/billing";
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

/** Sequential document numbers, e.g. INV-2026-0004. */
async function nextNumber(kind: "invoice" | "credit") {
  const year = new Date().getFullYear();
  const prefix = kind === "invoice" ? `INV-${year}` : `CN-${year}`;

  const existing =
    kind === "invoice"
      ? await prisma.invoice.findMany({ where: { number: { startsWith: prefix } }, select: { number: true } })
      : await prisma.creditNote.findMany({ where: { number: { startsWith: prefix } }, select: { number: true } });

  const taken = new Set(existing.map((r) => r.number));
  let n = taken.size + 1;
  let number = `${prefix}-${String(n).padStart(4, "0")}`;
  while (taken.has(number)) {
    n += 1;
    number = `${prefix}-${String(n).padStart(4, "0")}`;
  }
  return number;
}

type LineItem = {
  serviceId?: string;
  title: string;
  description?: string;
  quantity: string;
  unitPrice: string;
  billingCycle?: string;
};

/** Money is recomputed on the server; the browser total is only a preview. */
function priceItems(items: LineItem[], discountPct: number, taxPct: number) {
  const priced = items
    .filter((i) => i.title?.trim())
    .map((i, index) => {
      const quantity = Math.max(1, Number(i.quantity) || 1);
      const unitPrice = Math.max(0, Math.round(Number(i.unitPrice) || 0));
      return {
        serviceId: i.serviceId || null,
        title: i.title.trim(),
        description: i.description?.trim() || null,
        quantity,
        unitPrice,
        amount: quantity * unitPrice,
        billingCycle: toBillingCycle(i.billingCycle),
        order: index,
      };
    });

  const subtotal = priced.reduce((sum, i) => sum + i.amount, 0);
  const afterDiscount = Math.round(subtotal * (1 - discountPct / 100));
  const total = Math.round(afterDiscount * (1 + taxPct / 100));
  return { priced, subtotal, total };
}

/** Keeps status in step with what has actually been collected. */
async function refreshInvoiceStatus(invoiceId: string) {
  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true, creditNotes: true },
  });
  if (!invoice) return;

  const credited = invoice.creditNotes.reduce((sum, c) => sum + c.amount, 0);
  const paid = invoice.payments.reduce((sum, p) => sum + p.amount, 0);
  const payable = Math.max(0, invoice.total - credited);

  let status = invoice.status;
  if (invoice.status !== "CANCELLED" && invoice.status !== "DRAFT") {
    if (paid >= payable && payable > 0) status = "PAID";
    else if (paid > 0) status = "PARTIALLY_PAID";
    else if (invoice.dueDate && invoice.dueDate < new Date()) status = "OVERDUE";
    else status = "SENT";
  }

  await prisma.invoice.update({
    where: { id: invoiceId },
    data: { amountPaid: paid, status, paidAt: status === "PAID" ? (invoice.paidAt ?? new Date()) : null },
  });
}

/**
 * Every surface an invoice appears on. The print route is the one that used to
 * be missed, which is why an edited invoice still printed its old figures.
 */
function refreshInvoice(invoiceId: string) {
  revalidatePath(`/admin/finance/invoices/${invoiceId}`);
  revalidatePath(`/admin/finance/invoices/${invoiceId}/edit`);
  revalidatePath(`/admin/print/invoice/${invoiceId}`);
  revalidatePath("/admin/finance/invoices");
  revalidatePath("/admin/finance");
  revalidatePath("/portal/invoices");
}

// ------------------------------------------------------------------ invoices

export async function saveInvoice(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("finance", "write");
  const id = str(form, "id");
  const clientId = str(form, "clientId");
  const title = str(form, "title");

  if (!clientId) return { error: "Pick a client for this invoice." };
  if (!title) return { error: "Give the invoice a title." };

  let items: LineItem[] = [];
  try {
    const parsed: unknown = JSON.parse(str(form, "items") || "[]");
    if (Array.isArray(parsed)) items = parsed as LineItem[];
  } catch {
    return { error: "Could not read the line items." };
  }
  if (!items.some((i) => i.title?.trim())) return { error: "Add at least one line item." };

  const discountPct = Math.max(0, Math.min(100, int(form, "discountPct")));
  const taxPct = Math.max(0, Math.min(100, int(form, "taxPct", 18)));
  const { priced, subtotal, total } = priceItems(items, discountPct, taxPct);

  const data = {
    title,
    clientId,
    kind: (str(form, "kind") || "STANDARD") as never,
    status: (str(form, "status") || "DRAFT") as never,
    projectId: nullable(form, "projectId"),
    quotationId: nullable(form, "quotationId"),
    milestoneId: nullable(form, "milestoneId"),
    renewalId: nullable(form, "renewalId"),
    issueDate: date(form, "issueDate") ?? new Date(),
    dueDate: date(form, "dueDate"),
    discountPct,
    taxPct,
    subtotal,
    total,
    terms: str(form, "terms") || null,
    notes: str(form, "notes") || null,
    ownerId: nullable(form, "ownerId") ?? session.id,
  };

  let invoiceId = id;
  try {
    if (id) {
      await prisma.invoice.update({ where: { id }, data });
      await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
    } else {
      const created = await prisma.invoice.create({ data: { ...data, number: await nextNumber("invoice") } });
      invoiceId = created.id;
    }
    await prisma.invoiceItem.createMany({ data: priced.map((i) => ({ ...i, invoiceId })) });
    await refreshInvoiceStatus(invoiceId);
  } catch (error) {
    console.error("[finance] saveInvoice", error);
    return { error: "Could not save this invoice." };
  }

  await logActivity(session.id, id ? "update" : "create", "Invoice", invoiceId, title);
  refreshInvoice(invoiceId);
  redirect(`/admin/finance/invoices/${invoiceId}`);
}

export async function setInvoiceStatus(id: string, form: FormData): Promise<void> {
  const session = await requirePermission("finance", "write");
  const status = str(form, "status");

  await prisma.invoice.update({
    where: { id },
    data: { status: status as never, sentAt: status === "SENT" ? new Date() : undefined },
  });
  if (status !== "DRAFT" && status !== "CANCELLED") await refreshInvoiceStatus(id);

  await logActivity(session.id, "update", "Invoice", id, `status → ${status}`);
  refreshInvoice(id);
}

export async function deleteInvoice(id: string) {
  const session = await requirePermission("finance", "write");

  const paid = await prisma.payment.count({ where: { invoiceId: id } });
  if (paid) return { error: "Payments are recorded against this invoice. Cancel it instead of deleting." };

  await prisma.creditNote.deleteMany({ where: { invoiceId: id } });
  await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
  await prisma.invoice.delete({ where: { id } });

  await logActivity(session.id, "delete", "Invoice", id);
  revalidatePath("/admin/finance");
  redirect("/admin/finance/invoices");
}

/** Turns an accepted quotation into an invoice without re-entering anything. */
export async function convertQuotationToInvoice(quotationId: string): Promise<void> {
  const session = await requirePermission("finance", "write");

  const quotation = await prisma.quotation.findUnique({
    where: { id: quotationId },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!quotation) return;

  const existing = await prisma.invoice.findFirst({ where: { quotationId } });
  if (existing) redirect(`/admin/finance/invoices/${existing.id}`);

  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 15);

  const invoice = await prisma.invoice.create({
    data: {
      number: await nextNumber("invoice"),
      title: quotation.title,
      clientId: quotation.clientId,
      quotationId: quotation.id,
      status: "DRAFT",
      issueDate: new Date(),
      dueDate,
      discountPct: quotation.discountPct,
      taxPct: quotation.taxPct,
      subtotal: quotation.subtotal,
      total: quotation.total,
      terms: quotation.terms,
      ownerId: session.id,
      items: {
        create: quotation.items.map((i) => ({
          serviceId: i.serviceId,
          title: i.title,
          description: i.description,
          quantity: i.quantity,
          unitPrice: i.unitPrice,
          amount: i.amount,
          billingCycle: i.billingCycle,
          order: i.order,
        })),
      },
    },
  });

  await logActivity(session.id, "convert", "Quotation", quotationId, `${quotation.number} → ${invoice.number}`);
  refreshInvoice(invoice.id);
  redirect(`/admin/finance/invoices/${invoice.id}`);
}

// ------------------------------------------------------------------ payments

export async function recordPayment(invoiceId: string, form: FormData): Promise<void> {
  const session = await requirePermission("finance", "write");
  const amount = int(form, "amount");
  if (amount <= 0) return;

  const invoice = await prisma.invoice.findUnique({ where: { id: invoiceId }, select: { clientId: true, number: true } });
  if (!invoice) return;

  const payment = await prisma.payment.create({
    data: {
      invoiceId,
      clientId: invoice.clientId,
      amount,
      mode: (str(form, "mode") || "BANK_TRANSFER") as never,
      reference: str(form, "reference"),
      paidAt: date(form, "paidAt") ?? new Date(),
      notes: str(form, "notes") || null,
      recordedById: session.id,
    },
  });

  await refreshInvoiceStatus(invoiceId);
  await logActivity(session.id, "create", "Payment", invoiceId, `${invoice.number} received ${amount}`);
  await alertPaymentRecorded(payment.id);

  refreshInvoice(invoiceId);
}

export async function deletePayment(id: string): Promise<void> {
  const session = await requirePermission("finance", "write");
  const payment = await prisma.payment.findUnique({ where: { id }, select: { invoiceId: true } });
  await prisma.payment.delete({ where: { id } });
  if (payment) {
    await refreshInvoiceStatus(payment.invoiceId);
    refreshInvoice(payment.invoiceId);
  }
  await logActivity(session.id, "delete", "Payment", id);
  revalidatePath("/admin/finance");
}

export async function issueCreditNote(invoiceId: string, form: FormData): Promise<void> {
  const session = await requirePermission("finance", "write");
  const amount = int(form, "amount");
  const reason = str(form, "reason");
  if (amount <= 0 || !reason) return;

  await prisma.creditNote.create({
    data: { invoiceId, number: await nextNumber("credit"), amount, reason },
  });

  await refreshInvoiceStatus(invoiceId);
  await logActivity(session.id, "create", "CreditNote", invoiceId, reason);
  refreshInvoice(invoiceId);
}

/** Emails the client their outstanding balance and logs the attempt. */
export async function sendPaymentReminder(invoiceId: string): Promise<void> {
  const session = await requirePermission("finance", "write");

  const invoice = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { client: { include: { contacts: { where: { isPrimary: true }, take: 1 } } } },
  });
  if (!invoice) return;

  const to = invoice.client.contacts[0]?.email;
  if (!to) return;

  const balance = invoice.total - invoice.amountPaid;
  const { dispatch } = await import("@/lib/notify");

  await dispatch({
    channel: "EMAIL",
    to,
    templateKey: "invoice_reminder",
    subject: `Payment reminder — ${invoice.number}`,
    body: `<p>Dear ${invoice.client.name},</p><p>Invoice <strong>${invoice.number}</strong> for ${invoice.title} has an outstanding balance of ₹${balance.toLocaleString("en-IN")}.</p><p>We would appreciate settlement at your earliest convenience.</p>`,
    entity: "Invoice",
    entityId: invoiceId,
    variables: {
      client: invoice.client.name,
      number: invoice.number,
      title: invoice.title,
      balance: balance.toLocaleString("en-IN"),
      dueDate: invoice.dueDate ? invoice.dueDate.toLocaleDateString("en-IN") : "",
    },
  });

  await logActivity(session.id, "notify", "Invoice", invoiceId, `reminder sent to ${to}`);
  refreshInvoice(invoiceId);
}

// ------------------------------------- income and expenses (money register)

const RECURRENCES = new Set(["NONE", "WEEKLY", "MONTHLY", "QUARTERLY", "HALF_YEARLY", "YEARLY"]);

/** Days to add for one turn of a recurring entry. */
const RECURRENCE_MONTHS: Record<string, number> = {
  MONTHLY: 1,
  QUARTERLY: 3,
  HALF_YEARLY: 6,
  YEARLY: 12,
};

/**
 * The date a recurring entry next falls due after `from`.
 *
 * Not exported: a "use server" module may only export async functions, and
 * nothing outside this file needs it.
 */
function nextOccurrence(from: Date, recurrence: string): Date | null {
  if (recurrence === "WEEKLY") {
    const next = new Date(from);
    next.setDate(next.getDate() + 7);
    return next;
  }

  const months = RECURRENCE_MONTHS[recurrence];
  if (!months) return null;

  const next = new Date(from);
  next.setMonth(next.getMonth() + months);
  return next;
}

export async function saveExpense(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("finance", "write");
  const id = str(form, "id");
  const title = str(form, "title");
  const amount = int(form, "amount");
  const direction = str(form, "direction") === "INCOME" ? "INCOME" : "EXPENSE";
  const kind = direction === "INCOME" ? "income" : "expense";

  if (!title) return { error: `Give the ${kind} a title.` };
  if (amount <= 0) return { error: "Enter an amount." };

  const recurrenceRaw = str(form, "recurrence");
  const isSettled = str(form, "isSettled") !== "false";
  const dueDate = date(form, "dueDate");

  const data = {
    direction: direction as "INCOME" | "EXPENSE",
    title,
    amount,
    category: str(form, "category") || "General",
    vendor: str(form, "vendor"),
    paymentMode: str(form, "paymentMode"),
    reference: str(form, "reference"),
    clientId: nullable(form, "clientId"),
    projectId: nullable(form, "projectId"),
    serviceId: nullable(form, "serviceId"),
    spentAt: date(form, "spentAt") ?? new Date(),
    dueDate,
    isSettled,
    // A reminder needs something to remind about, so it only sticks on an entry
    // that is still open and carries a date.
    remind: !isSettled && Boolean(dueDate) && str(form, "remind") === "on",
    remindDaysBefore: Math.max(0, Math.min(90, int(form, "remindDaysBefore", 3))),
    recurrence: (RECURRENCES.has(recurrenceRaw) ? recurrenceRaw : "NONE") as
      | "NONE" | "WEEKLY" | "MONTHLY" | "QUARTERLY" | "HALF_YEARLY" | "YEARLY",
    notes: str(form, "notes") || null,
    recordedById: session.id,
  };

  try {
    if (id) await prisma.expense.update({ where: { id }, data });
    else await prisma.expense.create({ data });
  } catch (error) {
    console.error("[finance] saveExpense", error);
    return { error: `Could not save this ${kind}.` };
  }

  await logActivity(session.id, id ? "update" : "create", "Expense", id || undefined, title);
  revalidatePath("/admin/finance/expenses");
  revalidatePath("/admin/finance");
  return { ok: true, message: `${direction === "INCOME" ? "Income" : "Expense"} saved.` };
}

/**
 * Marks an open entry as received or paid.
 *
 * A recurring entry immediately schedules its next turn, so a monthly rent or
 * retainer is never forgotten between one settlement and the next.
 */
export async function settleExpense(id: string): Promise<void> {
  const session = await requirePermission("finance", "write");

  const entry = await prisma.expense.findUnique({ where: { id } });
  if (!entry || entry.isSettled) return;

  await prisma.expense.update({
    where: { id },
    data: { isSettled: true, spentAt: new Date(), remind: false },
  });

  const due = entry.dueDate ?? entry.spentAt;
  const next = nextOccurrence(due, entry.recurrence);
  if (next) {
    await prisma.expense.create({
      data: {
        direction: entry.direction,
        title: entry.title,
        amount: entry.amount,
        category: entry.category,
        vendor: entry.vendor,
        paymentMode: entry.paymentMode,
        clientId: entry.clientId,
        projectId: entry.projectId,
        serviceId: entry.serviceId,
        spentAt: next,
        dueDate: next,
        isSettled: false,
        remind: entry.remind,
        remindDaysBefore: entry.remindDaysBefore,
        recurrence: entry.recurrence,
        notes: entry.notes,
        recordedById: session.id,
      },
    });
  }

  await logActivity(session.id, "update", "Expense", id, "settled");
  revalidatePath("/admin/finance/expenses");
  revalidatePath("/admin/finance");
}

export async function deleteExpense(id: string): Promise<void> {
  const session = await requirePermission("finance", "write");
  await prisma.expense.delete({ where: { id } });
  await logActivity(session.id, "delete", "Expense", id);
  revalidatePath("/admin/finance/expenses");
  revalidatePath("/admin/finance");
}

/** Manual trigger for the same sweep the scheduler runs nightly. */
export async function flagOverdueInvoices() {
  await requirePermission("finance", "write");
  const { overdueInvoiceSweep } = await import("@/lib/automation");
  const result = await overdueInvoiceSweep();
  revalidatePath("/admin/finance");
  return result;
}

export type InvoiceTotals = Prisma.InvoiceGetPayload<{ select: { total: true; amountPaid: true } }>;
