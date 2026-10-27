"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { createSession, hashPassword, logActivity } from "@/lib/auth";
import {
  clearOtp,
  createResetToken,
  findActiveUser,
  issueOtp,
  otpMatches,
  pendingOtp,
  verifyResetToken,
} from "@/lib/auth-recovery";
import { sendMail } from "@/lib/mailer";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { getSettings } from "@/lib/queries";
import { absoluteUrl } from "@/lib/utils";

export type RecoveryState = { error?: string; message?: string; step?: "email" | "code"; email?: string };

const emailSchema = z.email("Enter a valid email");

/**
 * Neither form says whether an address has an account. Either answer would let
 * anyone probe the panel for valid logins one email at a time.
 */
const SENT_RESET = "If that email belongs to an admin account, a reset link is on its way. It works for 30 minutes.";

async function ip() {
  return clientIp(await headers());
}

/** Plain, inline-styled mail: most clients strip <style> blocks. */
function mailBody(siteName: string, heading: string, lines: string[], action?: { label: string; url: string }) {
  const button = action
    ? `<p style="margin:28px 0"><a href="${action.url}" style="background:#011460;color:#ffffff;text-decoration:none;padding:12px 22px;border-radius:10px;font-weight:600;display:inline-block">${action.label}</a></p>
       <p style="font-size:12px;color:#64748b">Or paste this link into your browser:<br>${action.url}</p>`
    : "";
  return `<div style="font-family:Arial,Helvetica,sans-serif;max-width:520px;margin:0 auto;color:#0f172a">
    <h2 style="color:#011460">${heading}</h2>
    ${lines.map((l) => `<p style="line-height:1.6">${l}</p>`).join("")}
    ${button}
    <p style="font-size:12px;color:#64748b;margin-top:32px">If you did not ask for this, ignore this email — nothing changes until the link or code is used.<br>— ${siteName}</p>
  </div>`;
}

// ---------------------------------------------------------------- forgot

export async function requestPasswordReset(_prev: RecoveryState, formData: FormData): Promise<RecoveryState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Enter a valid email" };
  const email = parsed.data.toLowerCase().trim();

  if (!rateLimit(`reset-ip:${await ip()}`, 10, 15 * 60_000).ok || !rateLimit(`reset:${email}`, 3, 15 * 60_000).ok) {
    return { error: "Too many requests. Wait a few minutes and try again." };
  }

  const user = await findActiveUser(email);
  if (user) {
    const settings = await getSettings();
    const url = absoluteUrl(`/admin/reset-password?token=${encodeURIComponent(await createResetToken(user))}`);
    const sent = await sendMail({
      to: user.email,
      subject: `Reset your ${settings.siteName} admin password`,
      html: mailBody(
        settings.siteName,
        "Reset your password",
        [`Hi ${user.name},`, "Someone asked to reset the password for your admin account. The link below works once, for the next 30 minutes."],
        { label: "Choose a new password", url },
      ),
    });
    if (!sent.sent) {
      console.error("password reset mail failed:", sent.reason);
      return { error: "We could not send the email just now. Try again shortly, or ask an administrator." };
    }
    await logActivity(user.id, "password_reset_requested", "User", user.id, `${user.name} asked for a reset link`);
  }

  return { message: SENT_RESET };
}

const resetSchema = z
  .object({
    token: z.string().min(1),
    password: z.string().min(8, "Use at least 8 characters"),
    confirm: z.string(),
  })
  .refine((v) => v.password === v.confirm, { message: "The two passwords do not match", path: ["confirm"] });

export async function resetPassword(_prev: RecoveryState, formData: FormData): Promise<RecoveryState> {
  const parsed = resetSchema.safeParse({
    token: formData.get("token"),
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the form" };

  const user = await verifyResetToken(parsed.data.token);
  if (!user) return { error: "This link has expired or has already been used. Ask for a new one." };

  await prisma.user.update({ where: { id: user.id }, data: { passwordHash: await hashPassword(parsed.data.password) } });
  await logActivity(user.id, "password_reset", "User", user.id, `${user.name} reset their password`);
  redirect("/admin/login?reset=done");
}

// ------------------------------------------------------------------- otp

/**
 * The one-time-code screen's single action. The button pressed decides what
 * happens, and the step it returns decides what the screen shows next.
 */
export async function otpAction(prev: RecoveryState, formData: FormData): Promise<RecoveryState> {
  const intent = formData.get("intent");
  if (intent === "verify") return verifyOtp(prev, formData);
  if (intent === "restart") {
    await clearOtp();
    return { step: "email", email: prev.email };
  }
  return requestOtp(prev, formData);
}

async function requestOtp(_prev: RecoveryState, formData: FormData): Promise<RecoveryState> {
  const parsed = emailSchema.safeParse(formData.get("email"));
  if (!parsed.success) return { step: "email", error: parsed.error.issues[0]?.message ?? "Enter a valid email" };
  const email = parsed.data.toLowerCase().trim();

  if (!rateLimit(`otp-ip:${await ip()}`, 10, 15 * 60_000).ok || !rateLimit(`otp:${email}`, 3, 10 * 60_000).ok) {
    return { step: "email", email, error: "Too many codes requested. Wait a few minutes and try again." };
  }

  const user = await findActiveUser(email);
  if (user) {
    const settings = await getSettings();
    const { code, minutes } = await issueOtp(user);
    const sent = await sendMail({
      to: user.email,
      subject: `${code} is your ${settings.siteName} sign-in code`,
      html: mailBody(settings.siteName, "Your sign-in code", [
        `Hi ${user.name},`,
        `Use this code to sign in to the admin panel. It expires in ${minutes} minutes.`,
        `<span style="font-size:32px;font-weight:700;letter-spacing:8px;color:#011460">${code}</span>`,
      ]),
    });
    if (!sent.sent) {
      console.error("otp mail failed:", sent.reason);
      await clearOtp();
      return { step: "email", email, error: "We could not send the code just now. Try again shortly, or sign in with your password." };
    }
  } else {
    // No account: drop any earlier pending code so the next step fails cleanly.
    await clearOtp();
  }

  return {
    step: "code",
    email,
    message: "If that email belongs to an admin account, a 6-digit code is on its way. It expires in 10 minutes.",
  };
}

async function verifyOtp(_prev: RecoveryState, formData: FormData): Promise<RecoveryState> {
  const email = String(formData.get("email") ?? "");
  const code = String(formData.get("code") ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { step: "code", email, error: "Enter the 6-digit code from the email." };

  const pending = await pendingOtp();
  if (!pending) return { step: "code", email, error: "That code is wrong or has expired. Request a new one." };

  // Five guesses per code. Past that the code is burned, not merely slowed down.
  if (!rateLimit(`otp-verify:${pending.hash}`, 5, 10 * 60_000).ok) {
    await clearOtp();
    return { step: "email", email, error: "Too many wrong attempts. Request a new code." };
  }

  if (!otpMatches(pending, code)) return { step: "code", email, error: "That code is wrong or has expired. Request a new one." };

  const user = await prisma.user.findUnique({ where: { id: pending.userId } });
  if (!user?.isActive) {
    await clearOtp();
    return { step: "email", error: "This account is not active." };
  }

  await clearOtp();
  await prisma.user.update({ where: { id: user.id }, data: { lastLoginAt: new Date() } });
  await createSession({ id: user.id, name: user.name, email: user.email, role: user.role });
  await logActivity(user.id, "login", "User", user.id, `${user.name} signed in with a one-time code`);
  redirect("/admin");
}
