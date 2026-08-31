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
