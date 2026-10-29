"use server";

import { revalidatePath } from "next/cache";
import { logActivity, requirePermission, requireSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { istDay, parseDayKey } from "@/lib/activity";

export type JustifyState = { error?: string; message?: string };

/** The person's own reason for a short day. Today cannot be justified until it is over. */
export async function justifyDay(_prev: JustifyState, form: FormData): Promise<JustifyState> {
  const session = await requireSession();
  const date = parseDayKey(String(form.get("date") ?? ""));
  const text = String(form.get("justification") ?? "").trim();

  if (!date) return { error: "Unknown day." };
  if (date.getTime() >= istDay().getTime()) return { error: "Today is not over yet." };
  if (text.length < 5) return { error: "Write a line or two about what happened." };

  const data = { justification: text.slice(0, 2000), justifiedAt: new Date(), reviewStatus: "PENDING", reviewNote: null, reviewedById: null, reviewedAt: null };
  await prisma.activityDay.upsert({
    where: { userId_date: { userId: session.id, date } },
    update: data,
    // A day with no activity at all has no row yet.
    create: { userId: session.id, date, ...data },
  });

  await logActivity(session.id, "justify", "ActivityDay", undefined, text.slice(0, 120));
  revalidatePath("/admin/my-time");
  revalidatePath("/admin/hr/activity");
  return { message: "Sent for review." };
}

export async function reviewDay(id: string, form: FormData): Promise<void> {
  const session = await requirePermission("team", "write");
  const status = String(form.get("status") ?? "");
  if (status !== "ACCEPTED" && status !== "REJECTED") return;

  const day = await prisma.activityDay.findUnique({ where: { id }, select: { userId: true } });
  if (!day || day.userId === session.id) return; // nobody signs off their own day

  await prisma.activityDay.update({
    where: { id },
    data: {
      reviewStatus: status,
      reviewNote: String(form.get("note") ?? "").trim() || null,
      reviewedById: session.id,
      reviewedAt: new Date(),
    },
  });
  await logActivity(session.id, `activity_${status.toLowerCase()}`, "ActivityDay", id);
  revalidatePath("/admin/hr/activity");
  revalidatePath("/admin/my-time");
}
