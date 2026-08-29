import "server-only";
import nodemailer from "nodemailer";

function transport() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD) return null;

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT ?? 587),
    secure: Number(SMTP_PORT ?? 587) === 465,
    auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
  });
}

/** Generic send used by the notification dispatcher. */
export async function sendMail({ to, subject, html }: { to: string; subject: string; html: string }) {
  const mailer = transport();
  if (!mailer) return { sent: false, reason: "SMTP is not configured" };

  try {
    const info = await mailer.sendMail({
      from: process.env.SMTP_FROM ?? process.env.SMTP_USER,
      to,
      subject,
      html,
    });
    return { sent: true, messageId: info.messageId };
  } catch (error) {
    return { sent: false, reason: error instanceof Error ? error.message : "Send failed" };
  }
}

/**
 * Enquiry notifications are best-effort: a mail failure must never block a
 * lead from being written to the database.
 */
export async function sendEnquiryNotification(payload: {
  name: string;
  email: string;
  phone: string;
  company: string;
  serviceInterest: string;
  budget: string;
  message: string;
  pageUrl: string;
}) {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD, SMTP_FROM, ENQUIRY_NOTIFY_TO } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASSWORD || !ENQUIRY_NOTIFY_TO) return { sent: false, reason: "not-configured" };

  try {
    const transport = nodemailer.createTransport({
      host: SMTP_HOST,
      port: Number(SMTP_PORT ?? 587),
      secure: Number(SMTP_PORT ?? 587) === 465,
      auth: { user: SMTP_USER, pass: SMTP_PASSWORD },
    });

    const rows = Object.entries({
      Name: payload.name,
      Email: payload.email,
      Phone: payload.phone || "—",
      Company: payload.company || "—",
      Service: payload.serviceInterest || "—",
      Budget: payload.budget || "—",
      Page: payload.pageUrl || "—",
    })
      .map(([k, v]) => `<tr><td style="padding:6px 14px 6px 0;color:#64748b">${k}</td><td style="padding:6px 0"><strong>${escapeHtml(v)}</strong></td></tr>`)
      .join("");

    await transport.sendMail({
      from: SMTP_FROM ?? SMTP_USER,
      to: ENQUIRY_NOTIFY_TO,
      replyTo: payload.email,
      subject: `New enquiry — ${payload.name}${payload.serviceInterest ? ` (${payload.serviceInterest})` : ""}`,
      html: `
        <div style="font-family:system-ui,sans-serif;color:#0f1a3c">
          <h2 style="margin:0 0 16px">New website enquiry</h2>
          <table style="border-collapse:collapse;font-size:14px">${rows}</table>
          <p style="margin:20px 0 6px;color:#64748b">Message</p>
          <p style="white-space:pre-wrap;margin:0;padding:14px;background:#faf8f3;border-left:3px solid #b48c24">${escapeHtml(payload.message)}</p>
        </div>`,
    });

    return { sent: true };
  } catch (error) {
    console.error("[mailer] enquiry notification failed", error);
    return { sent: false, reason: "send-failed" };
  }
}

function escapeHtml(value: string) {
  return value.replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[c] as string,
  );
}
