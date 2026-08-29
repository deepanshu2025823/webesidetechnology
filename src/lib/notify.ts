import "server-only";
import { prisma } from "@/lib/prisma";
import type { Channel } from "@/generated/prisma/enums";

/**
 * One place every alert in the platform goes through.
 *
 * `notify` always writes an in-app Notification. `dispatch` additionally sends
 * through a provider channel when one is configured — email works out of the
 * box; WhatsApp, SMS and IVR record a SKIPPED log until credentials are added
 * in Settings → Integrations, so nothing silently disappears.
 */

type NotifyInput = {
  userIds: string[];
  type: string;
  title: string;
  body?: string;
  url?: string;
  entity?: string;
  entityId?: string;
};

export async function notify({ userIds, type, title, body, url, entity, entityId }: NotifyInput) {
  const unique = [...new Set(userIds.filter(Boolean))];
  if (!unique.length) return;

  await prisma.notification.createMany({
    data: unique.map((userId) => ({
      userId,
      type,
      title,
      body: body ?? null,
      url: url ?? "",
      entity: entity ?? "",
      entityId: entityId ?? "",
    })),
  });
}

/** Everyone who should hear about management-level events. */
export async function managementUserIds() {
  const users = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["SUPER_ADMIN", "DIRECTOR"] } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

export async function financeUserIds() {
  const users = await prisma.user.findMany({
    where: { isActive: true, role: { in: ["SUPER_ADMIN", "DIRECTOR", "FINANCE"] } },
    select: { id: true },
  });
  return users.map((u) => u.id);
}

// ---------------------------------------------------------------- messaging

type DispatchInput = {
  channel: Channel;
  to: string;
  templateKey?: string;
  subject?: string;
  body: string;
  entity?: string;
  entityId?: string;
  /** Values substituted into {{placeholders}} in the stored template. */
  variables?: Record<string, string | number>;
};

function fill(template: string, variables: Record<string, string | number> = {}) {
  return template.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, key) =>
    key in variables ? String(variables[key]) : "",
  );
}

/**
 * Sends a message and always writes a MessageLog row, whatever the outcome.
 * Returns the log id so callers can surface delivery status.
 */
export async function dispatch(input: DispatchInput) {
  const { channel, to, templateKey, entity, entityId, variables } = input;

  let subject = input.subject ?? "";
  let body = input.body;
  let templateId: string | null = null;

  if (templateKey) {
    const template = await prisma.messageTemplate.findUnique({ where: { key: templateKey } });
    if (template?.isActive) {
      templateId = template.id;
      subject = fill(template.subject, variables);
      body = fill(template.body, variables);
    }
  }

  const log = await prisma.messageLog.create({
    data: { channel, templateId, toAddress: to, subject, body, entity: entity ?? "", entityId: entityId ?? "" },
  });

  try {
    const result = await send(channel, to, subject, body);
    await prisma.messageLog.update({
      where: { id: log.id },
      data: {
        status: result.status,
        providerRef: result.ref ?? "",
        error: result.error ?? null,
        sentAt: result.status === "SENT" ? new Date() : null,
      },
    });
  } catch (error) {
    await prisma.messageLog.update({
      where: { id: log.id },
      data: { status: "FAILED", error: error instanceof Error ? error.message : "Unknown error" },
    });
  }

  return log.id;
}

type SendResult = { status: "SENT" | "SKIPPED" | "FAILED"; ref?: string; error?: string };

async function send(channel: Channel, to: string, subject: string, body: string): Promise<SendResult> {
  if (channel === "IN_APP") return { status: "SENT" };

  if (channel === "EMAIL") {
    const { sendMail } = await import("@/lib/mailer");
    const sent = await sendMail({ to, subject, html: body });
    return sent.sent
      ? { status: "SENT", ref: sent.messageId }
      : { status: "SKIPPED", error: sent.reason };
  }

  // WhatsApp / SMS run through the provider configured in admin settings.
  const provider = await prisma.integrationSetting.findUnique({
    where: { provider: channel === "WHATSAPP" ? "whatsapp" : "sms" },
  });

  if (!provider?.isEnabled) {
    return { status: "SKIPPED", error: `${channel} provider is not configured` };
  }

  const config = (provider.config ?? {}) as Record<string, string>;
  if (!config.endpoint || !config.token) {
    return { status: "SKIPPED", error: `${channel} provider is missing an endpoint or token` };
  }

  const response = await fetch(config.endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${config.token}` },
    body: JSON.stringify({ to, message: body, sender: config.sender ?? "" }),
  });

  if (!response.ok) {
    return { status: "FAILED", error: `Provider replied ${response.status}` };
  }

  const payload = (await response.json().catch(() => ({}))) as { id?: string; messageId?: string };
  return { status: "SENT", ref: payload.id ?? payload.messageId ?? "" };
}
