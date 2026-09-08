"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity, requirePermission } from "@/lib/auth";
import type { Prisma } from "@/generated/prisma/client";
import { PROVIDERS } from "@/lib/admin/providers";
import type { ActionState } from "@/app/admin/actions/collections";

export type { ActionState };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();

export async function saveIntegration(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("integrations", "write");
  const provider = str(form, "provider");
  const definition = PROVIDERS.find((p) => p.key === provider);
  if (!definition) return { error: "Unknown provider." };

  const config: Record<string, string> = {};
  for (const field of definition.fields) {
    const value = str(form, field);
    if (value) config[field] = value;
  }

  await prisma.integrationSetting.upsert({
    where: { provider },
    create: {
      provider,
      label: definition.label,
      isEnabled: form.get("isEnabled") === "on",
      config: config as Prisma.InputJsonValue,
    },
    update: {
      label: definition.label,
      isEnabled: form.get("isEnabled") === "on",
      config: config as Prisma.InputJsonValue,
    },
  });

  await logActivity(session.id, "update", "IntegrationSetting", provider, definition.label);
  revalidatePath("/admin/integrations");
  return { ok: true, message: `${definition.label} saved.` };
}

/** Lets an admin run the nightly sweeps immediately, for testing. */
export async function runAutomationNow(): Promise<void> {
  const session = await requirePermission("integrations", "write");
  const { moneyReminderSweep, overdueInvoiceSweep, renewalReminderSweep, taskAlertSweep } = await import(
    "@/lib/automation"
  );

  const [renewals, invoices, money, tasks] = await Promise.all([
    renewalReminderSweep(),
    overdueInvoiceSweep(),
    moneyReminderSweep(),
    taskAlertSweep(),
  ]);

  await logActivity(
    session.id,
    "run",
    "Automation",
    undefined,
    `renewals ${renewals.notified}/${renewals.escalated}, invoices ${invoices.flagged}, money ${money.due}/${money.overdue}, tasks ${tasks.overdueTasks}`,
  );

  revalidatePath("/admin/integrations");
  revalidatePath("/admin");
}
