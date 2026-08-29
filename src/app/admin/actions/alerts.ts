"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";

/** Manual trigger for the nightly alert sweep. */
export async function runTaskAlerts() {
  await requireSession();
  const { taskAlertSweep } = await import("@/lib/automation");
  return taskAlertSweep();
}

// ---------------------------------------------------------------- in-app inbox

export async function markNotificationRead(id: string): Promise<void> {
  const session = await requireSession();
  await prisma.notification.updateMany({ where: { id, userId: session.id }, data: { isRead: true } });
  revalidatePath("/admin");
}

export async function markAllNotificationsRead(): Promise<void> {
  const session = await requireSession();
  await prisma.notification.updateMany({ where: { userId: session.id, isRead: false }, data: { isRead: true } });
  revalidatePath("/admin");
}
