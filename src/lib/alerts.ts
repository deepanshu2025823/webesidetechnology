import "server-only";
import { prisma } from "@/lib/prisma";
import { dispatch, financeUserIds, managementUserIds, notify } from "@/lib/notify";
import { getSettings } from "@/lib/queries";
import { absoluteUrl, formatDate } from "@/lib/utils";

/**
 * Event alerts: one call per business event, fanned out to the in-app bell and
 * to the official mailboxes.
 *
 * Every function here is best-effort and swallows its own failures — a mail
 * server being down must never roll back the lead, payment or client that was
 * just saved. Delivery is still recorded in MessageLog by `dispatch`, so a
 * silent failure is visible in admin rather than lost.
 */

const brand = { navy: "#011460", gold: "#b58726", cream: "#faf8f3" };

/**
 * Where team mail goes: the override env if set, otherwise the addresses on
 * the settings record, so the client can change it without a deploy.
 */
async function officialRecipients(): Promise<string[]> {
  const override = process.env.ENQUIRY_NOTIFY_TO;
  if (override) {
    return override
      .split(",")
      .map((address) => address.trim())
      .filter(Boolean);
  }

  const settings = await getSettings();
  return [settings.email, settings.altEmail].filter(Boolean);
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}

/** Branded shell shared by every alert mail, so they read as one system. */
function template({
  heading,
  intro,
  rows,
  note,
  cta,
}: {
  heading: string;
  intro?: string;
  rows: [string, string][];
  note?: string;
  cta?: { label: string; url: string };
}) {
  const cells = rows
    .filter(([, value]) => value)
    .map(
      ([label, value]) =>
        `<tr><td style="padding:7px 18px 7px 0;color:#64748b;font-size:13px;white-space:nowrap">${escapeHtml(
          label,
        )}</td><td style="padding:7px 0;font-size:14px;color:${brand.navy}"><strong>${escapeHtml(
          value,
        )}</strong></td></tr>`,
    )
    .join("");

  return `
  <div style="font-family:system-ui,-apple-system,Segoe UI,sans-serif;background:${brand.cream};padding:28px">
    <div style="max-width:560px;margin:0 auto;background:#fff;border-radius:14px;overflow:hidden;border:1px solid rgba(1,20,96,0.08)">
      <div style="height:4px;background:${brand.gold}"></div>
      <div style="padding:26px 28px">
        <h2 style="margin:0 0 6px;font-size:19px;color:${brand.navy}">${escapeHtml(heading)}</h2>
        ${intro ? `<p style="margin:0 0 18px;color:#64748b;font-size:14px">${escapeHtml(intro)}</p>` : ""}
        <table style="border-collapse:collapse;width:100%">${cells}</table>
        ${
          note
            ? `<p style="margin:18px 0 0;padding:13px 15px;background:${brand.cream};border-left:3px solid ${brand.gold};white-space:pre-wrap;font-size:13px;color:#334155">${escapeHtml(
                note,
              )}</p>`
            : ""
        }
        ${
          cta
            ? `<p style="margin:24px 0 0"><a href="${cta.url}" style="display:inline-block;background:${brand.navy};color:#fff;text-decoration:none;padding:11px 22px;border-radius:9px;font-size:14px;font-weight:600">${escapeHtml(
                cta.label,
              )}</a></p>`
            : ""
        }
      </div>
    </div>
  </div>`;
}

/** Send one alert mail to every official address. */
async function mailTeam(input: {
  subject: string;
  heading: string;
  intro?: string;
  rows: [string, string][];
  note?: string;
  cta?: { label: string; url: string };
  entity?: string;
  entityId?: string;
}) {
  const recipients = await officialRecipients();
  if (!recipients.length) return;

  const html = template(input);
  for (const to of recipients) {
    await dispatch({
      channel: "EMAIL",
      to,
      subject: input.subject,
      body: html,
      entity: input.entity,
      entityId: input.entityId,
    });
  }
}

/** Runs an alert without ever letting it break the action that triggered it. */
async function safely(label: string, run: () => Promise<void>) {
  try {
    await run();
  } catch (error) {
    console.error(`[alerts] ${label} failed`, error);
  }
}

const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

// ------------------------------------------------------------------- events

/** A new website enquiry or a lead added by the team. */
export async function alertNewLead(leadId: string) {
  await safely("new lead", async () => {
    const lead = await prisma.enquiry.findUnique({ where: { id: leadId } });
    if (!lead) return;

    const url = absoluteUrl(`/admin/leads/${lead.id}`);
    const audience = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["SUPER_ADMIN", "DIRECTOR", "SALES"] } },
      select: { id: true },
    });

    await notify({
      userIds: audience.map((u) => u.id),
      type: "lead_new",
      title: `New lead: ${lead.name}`,
      body: [lead.company, lead.serviceInterest].filter(Boolean).join(" · ") || lead.email,
      url: `/admin/leads/${lead.id}`,
      entity: "Enquiry",
      entityId: lead.id,
    });

    await mailTeam({
      subject: `New lead — ${lead.name}${lead.serviceInterest ? ` (${lead.serviceInterest})` : ""}`,
      heading: "New lead received",
      intro: `Source: ${lead.source}`,
      rows: [
        ["Name", lead.name],
        ["Email", lead.email],
        ["Phone", lead.phone],
        ["Company", lead.company],
        ["Service", lead.serviceInterest],
        ["Budget", lead.budget],
        ["Page", lead.pageUrl],
      ],
      note: lead.message,
      cta: { label: "Open the lead", url },
      entity: "Enquiry",
      entityId: lead.id,
    });
  });
}

/** A client record was created. */
export async function alertNewClient(clientId: string, actorName: string) {
  await safely("new client", async () => {
    const client = await prisma.client.findUnique({
      where: { id: clientId },
      include: { contacts: { where: { isPrimary: true }, take: 1 }, owner: { select: { name: true } } },
    });
    if (!client) return;

    await notify({
      userIds: await managementUserIds(),
      type: "client_new",
      title: `New client: ${client.name}`,
      body: `${client.code}${client.industry ? ` · ${client.industry}` : ""} — added by ${actorName}`,
      url: `/admin/clients/${client.id}`,
      entity: "Client",
      entityId: client.id,
    });

    await mailTeam({
      subject: `New client onboarded — ${client.name}`,
      heading: "New client added",
      intro: `Added by ${actorName}`,
      rows: [
        ["Company", client.name],
        ["Code", client.code],
        ["Industry", client.industry],
        ["Status", client.status.replace(/_/g, " ").toLowerCase()],
        ["Contact", client.contacts[0]?.name ?? ""],
        ["Contact email", client.contacts[0]?.email ?? ""],
        ["Account manager", client.owner?.name ?? "Unassigned"],
      ],
      cta: { label: "Open the client", url: absoluteUrl(`/admin/clients/${client.id}`) },
      entity: "Client",
      entityId: client.id,
    });
  });
}

/** Money received against an invoice. */
export async function alertPaymentRecorded(paymentId: string) {
  await safely("payment", async () => {
    const payment = await prisma.payment.findUnique({
      where: { id: paymentId },
      include: {
        client: { select: { name: true } },
        invoice: { select: { id: true, number: true, total: true, amountPaid: true } },
        recordedBy: { select: { name: true } },
      },
    });
    if (!payment) return;

    const outstanding = payment.invoice.total - payment.invoice.amountPaid;

    await notify({
      userIds: await financeUserIds(),
      type: "payment_received",
      title: `Payment received: ${money(payment.amount)}`,
      body: `${payment.client.name} · invoice ${payment.invoice.number}`,
      url: `/admin/finance/invoices/${payment.invoice.id}`,
      entity: "Payment",
      entityId: payment.id,
    });

    await mailTeam({
      subject: `Payment received — ${money(payment.amount)} from ${payment.client.name}`,
      heading: "Payment received",
      rows: [
        ["Client", payment.client.name],
        ["Invoice", payment.invoice.number],
        ["Amount", money(payment.amount)],
        ["Mode", payment.mode.replace(/_/g, " ").toLowerCase()],
        ["Reference", payment.reference],
        ["Paid on", formatDate(payment.paidAt)],
        ["Still outstanding", outstanding > 0 ? money(outstanding) : "Nil — invoice settled"],
        ["Recorded by", payment.recordedBy?.name ?? ""],
      ],
      cta: { label: "Open the invoice", url: absoluteUrl(`/admin/finance/invoices/${payment.invoice.id}`) },
      entity: "Payment",
      entityId: payment.id,
    });
  });
}

/** A team member applied for leave. */
export async function alertLeaveRequest(leaveId: string) {
  await safely("leave request", async () => {
    const leave = await prisma.leaveRequest.findUnique({
      where: { id: leaveId },
      include: { employee: { select: { name: true, department: true } } },
    });
    if (!leave) return;

    const approvers = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["SUPER_ADMIN", "DIRECTOR", "HR"] } },
      select: { id: true },
    });

    await notify({
      userIds: approvers.map((u) => u.id),
      type: "leave_requested",
      title: `Leave request: ${leave.employee.name}`,
      body: `${leave.days} day(s) · ${formatDate(leave.fromDate)} – ${formatDate(leave.toDate)}`,
      url: "/admin/hr/leave",
      entity: "LeaveRequest",
      entityId: leave.id,
    });

    await mailTeam({
      subject: `Leave request — ${leave.employee.name} (${leave.days} day${leave.days === 1 ? "" : "s"})`,
      heading: "Leave request awaiting approval",
      rows: [
        ["Employee", leave.employee.name],
        ["Department", leave.employee.department],
        ["Type", leave.type.toLowerCase()],
        ["From", formatDate(leave.fromDate)],
        ["To", formatDate(leave.toDate)],
        ["Days", String(leave.days)],
      ],
      note: leave.reason,
      cta: { label: "Review the request", url: absoluteUrl("/admin/hr/leave") },
      entity: "LeaveRequest",
      entityId: leave.id,
    });
  });
}

/** A chatbot visitor asked to speak to a person. */
export async function alertChatHandoff(sessionId: string) {
  await safely("chat handoff", async () => {
    const session = await prisma.chatSession.findUnique({
      where: { id: sessionId },
      include: { messages: { orderBy: { createdAt: "desc" }, take: 1, where: { role: "VISITOR" } } },
    });
    if (!session) return;

    const audience = await prisma.user.findMany({
      where: { isActive: true, role: { in: ["SUPER_ADMIN", "DIRECTOR", "SALES", "PROJECT_MANAGER"] } },
      select: { id: true },
    });
    const who = session.visitorName || "A website visitor";

    await notify({
      userIds: audience.map((u) => u.id),
      type: "chat_handoff",
      title: `${who} wants to talk to a human`,
      body: session.messages[0]?.body?.slice(0, 160) ?? "Waiting in live chat.",
      url: `/admin/chats/${session.id}`,
      entity: "ChatSession",
      entityId: session.id,
    });

    await mailTeam({
      subject: `Live chat — ${who} is waiting for an agent`,
      heading: "Someone asked for a human on chat",
      intro: "They are waiting in the chat window right now.",
      rows: [
        ["Name", session.visitorName],
        ["Email", session.visitorEmail],
        ["Phone", session.visitorPhone],
        ["Page", session.pageUrl],
      ],
      note: session.messages[0]?.body,
      cta: { label: "Join the chat", url: absoluteUrl(`/admin/chats/${session.id}`) },
      entity: "ChatSession",
      entityId: session.id,
    });
  });
}
