import "server-only";
import { prisma } from "@/lib/prisma";
import { dispatch, financeUserIds, managementUserIds, notify } from "@/lib/notify";

/**
 * Scheduled sweeps, shared by the nightly cron route and the manual "run now"
 * buttons in admin. Kept out of the "use server" action files because a route
 * handler cannot import server actions.
 */

export const DEFAULT_REMINDER_DAYS = [90, 60, 30, 15, 7, 1];

/** Renewal reminders, escalation and low-balance alerts — scope section 8. */
export async function renewalReminderSweep(): Promise<{ notified: number; escalated: number; lowBalance: number }> {
  const now = new Date();
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 95);

  const renewals = await prisma.renewal.findMany({
    where: { status: { in: ["ACTIVE", "DUE"] }, autoRemind: true },
    include: {
      client: { include: { contacts: { where: { isPrimary: true }, take: 1 } } },
    },
  });

  const management = await managementUserIds();
  let notified = 0;
  let escalated = 0;
  let lowBalance = 0;

  for (const renewal of renewals) {
    const daysLeft = Math.ceil((renewal.expiryDate.getTime() - now.getTime()) / 86_400_000);
    const thresholds = Array.isArray(renewal.reminderDays)
      ? (renewal.reminderDays as number[])
      : DEFAULT_REMINDER_DAYS;
    const audience = [renewal.ownerId, ...management].filter(Boolean) as string[];

    // Wallet services alert on balance, not only on a date.
    if (renewal.balance !== null && renewal.balanceThreshold !== null && renewal.balance <= renewal.balanceThreshold) {
      await notify({
        userIds: audience,
        type: "renewal_low_balance",
        title: `${renewal.name} balance is low`,
        body: `${renewal.client.name} — ₹${renewal.balance.toLocaleString("en-IN")} left.`,
        url: "/admin/renewals",
        entity: "Renewal",
        entityId: renewal.id,
      });
      lowBalance += 1;
    }

    if (renewal.expiryDate > horizon) continue;

    // One sweep per day per renewal, so thresholds never double-fire.
    if (renewal.lastRemindedAt && renewal.lastRemindedAt.toDateString() === now.toDateString()) continue;

    if (daysLeft <= 0) {
      await prisma.renewal.update({ where: { id: renewal.id }, data: { status: "DUE", lastRemindedAt: now } });
      await prisma.renewalEvent.create({
        data: { renewalId: renewal.id, type: "ESCALATED", note: `${Math.abs(daysLeft)} day(s) past expiry` },
      });
      await notify({
        userIds: audience,
        type: "renewal_overdue",
        title: `${renewal.name} has expired`,
        body: `${renewal.client.name} — ${Math.abs(daysLeft)} day(s) past expiry and unconfirmed.`,
        url: "/admin/renewals",
        entity: "Renewal",
        entityId: renewal.id,
      });
      escalated += 1;
      continue;
    }

    if (!thresholds.includes(daysLeft)) continue;

    await prisma.renewal.update({ where: { id: renewal.id }, data: { lastRemindedAt: now } });
    await prisma.renewalEvent.create({
      data: { renewalId: renewal.id, type: "REMINDER_SENT", note: `${daysLeft} day(s) before expiry` },
    });

    await notify({
      userIds: audience,
      type: "renewal_due",
      title: `${renewal.name} expires in ${daysLeft} day(s)`,
      body: `${renewal.client.name} — ₹${renewal.amount.toLocaleString("en-IN")} due on ${renewal.expiryDate.toDateString()}.`,
      url: "/admin/renewals",
      entity: "Renewal",
      entityId: renewal.id,
    });

    const contact = renewal.client.contacts[0]?.email;
    if (contact) {
      await dispatch({
        channel: "EMAIL",
        to: contact,
        templateKey: "renewal_reminder",
        subject: `${renewal.name} renewal — ${daysLeft} day(s) to go`,
        body: `<p>Dear ${renewal.client.name},</p><p>Your <strong>${renewal.name}</strong>${renewal.provider ? ` with ${renewal.provider}` : ""} is due for renewal on <strong>${renewal.expiryDate.toDateString()}</strong>.</p><p>Renewal amount: ₹${renewal.amount.toLocaleString("en-IN")}.</p><p>Please confirm so we can keep the service running without interruption.</p>`,
        entity: "Renewal",
        entityId: renewal.id,
        variables: {
          client: renewal.client.name,
          name: renewal.name,
          provider: renewal.provider,
          days: daysLeft,
          amount: renewal.amount.toLocaleString("en-IN"),
          expiry: renewal.expiryDate.toDateString(),
        },
      });
    }

    notified += 1;
  }

  return { notified, escalated, lowBalance };
}

/** Marks unpaid invoices overdue and tells finance once — scope section 17. */
export async function overdueInvoiceSweep(): Promise<{ flagged: number }> {
  const now = new Date();

  const overdue = await prisma.invoice.findMany({
    where: { status: { in: ["SENT", "PARTIALLY_PAID"] }, dueDate: { lt: now } },
    include: { client: { select: { name: true } } },
  });
  if (!overdue.length) return { flagged: 0 };

  await prisma.invoice.updateMany({
    where: { id: { in: overdue.map((i) => i.id) } },
    data: { status: "OVERDUE" },
  });

  const recipients = await financeUserIds();
  for (const invoice of overdue) {
    await notify({
      userIds: recipients,
      type: "invoice_overdue",
      title: `Invoice ${invoice.number} is overdue`,
      body: `${invoice.client.name} — ₹${(invoice.total - invoice.amountPaid).toLocaleString("en-IN")} outstanding.`,
      url: `/admin/finance/invoices/${invoice.id}`,
      entity: "Invoice",
      entityId: invoice.id,
    });
  }

  return { flagged: overdue.length };
}

/** Task due/overdue, lead follow-ups and pending approvals — scope section 18. */
export async function taskAlertSweep(): Promise<{
  dueTasks: number;
  overdueTasks: number;
  followUps: number;
  approvals: number;
}> {
  const now = new Date();
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);
  const tomorrow = new Date(endOfToday);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const management = await managementUserIds();

  const dueToday = await prisma.task.findMany({
    where: { status: { not: "DONE" }, dueDate: { gte: now, lte: endOfToday }, assigneeId: { not: null } },
    include: { project: { select: { id: true, name: true } } },
  });
  for (const task of dueToday) {
    await notify({
      userIds: [task.assigneeId!],
      type: "task_due",
      title: `Due today: ${task.title}`,
      body: task.project.name,
      url: `/admin/client-projects/${task.project.id}`,
      entity: "Task",
      entityId: task.id,
    });
  }

  const overdue = await prisma.task.findMany({
    where: { status: { not: "DONE" }, dueDate: { lt: now } },
    include: { project: { select: { id: true, name: true, managerId: true } } },
  });
  for (const task of overdue) {
    await notify({
      userIds: [task.assigneeId, task.project.managerId, ...management].filter(Boolean) as string[],
      type: "task_overdue",
      title: `Overdue: ${task.title}`,
      body: `${task.project.name} — was due ${task.dueDate?.toDateString() ?? ""}.`,
      url: `/admin/client-projects/${task.project.id}`,
      entity: "Task",
      entityId: task.id,
    });
  }

  const followUps = await prisma.enquiry.findMany({
    where: { status: { notIn: ["WON", "LOST"] }, nextFollowUpAt: { lte: endOfToday }, ownerId: { not: null } },
  });
  for (const lead of followUps) {
    await notify({
      userIds: [lead.ownerId!],
      type: "lead_followup",
      title: `Follow up with ${lead.name}`,
      body: lead.serviceInterest || "General enquiry",
      url: `/admin/leads/${lead.id}`,
      entity: "Enquiry",
      entityId: lead.id,
    });
  }

  const pending = await prisma.approval.findMany({
    where: { status: "PENDING", dueAt: { lte: tomorrow } },
    include: { client: { select: { name: true } } },
  });
  for (const approval of pending) {
    await notify({
      userIds: [approval.requestedById, ...management].filter(Boolean) as string[],
      type: "approval_pending",
      title: `Waiting on ${approval.client.name}`,
      body: approval.title,
      url: "/admin/portal",
      entity: "Approval",
      entityId: approval.id,
    });
  }

  return {
    dueTasks: dueToday.length,
    overdueTasks: overdue.length,
    followUps: followUps.length,
    approvals: pending.length,
  };
}
