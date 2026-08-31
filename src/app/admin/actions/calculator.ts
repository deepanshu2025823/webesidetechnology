"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity, requirePermission } from "@/lib/auth";
import type { ActionState } from "@/app/admin/actions/collections";

export type { ActionState };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";
const int = (f: FormData, k: string, fallback = 0) => {
  const raw = str(f, k).replace(/,/g, "");
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : fallback;
};

/** Both the site page and this admin screen rebuild after any change. */
function refresh() {
  revalidatePath("/cost-calculator");
  revalidatePath("/admin/calculator");
}

// ------------------------------------------------------------------ settings

export async function saveCalculatorSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("website", "write");

  const data = {
    isEnabled: bool(form, "isEnabled"),
    heading: str(form, "heading") || "Project cost calculator",
    subheading: str(form, "subheading"),
    basePrice: Math.max(0, int(form, "basePrice")),
    taxPercent: Math.max(0, Math.min(100, int(form, "taxPercent", 18))),
    variancePct: Math.max(0, Math.min(50, int(form, "variancePct", 15))),
    ctaLabel: str(form, "ctaLabel") || "Email me this estimate",
    disclaimer: str(form, "disclaimer"),
  };

  try {
    await prisma.calculatorSettings.upsert({ where: { id: 1 }, create: { id: 1, ...data }, update: data });
  } catch (error) {
    console.error("[calculator] saveCalculatorSettings", error);
    return { error: "Could not save the calculator settings." };
  }

  await logActivity(session.id, "update", "CalculatorSettings", "1");
  refresh();
  return { ok: true, message: "Calculator settings saved." };
}

// -------------------------------------------------------------------- groups

export async function saveCalculatorGroup(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("website", "write");
  const id = str(form, "id");
  const label = str(form, "label");
  if (!label) return { error: "The question needs a label." };

  const data = {
    label,
    help: str(form, "help"),
    kind: (str(form, "kind") || "SINGLE") as never,
    required: bool(form, "required"),
    order: int(form, "order"),
    isActive: bool(form, "isActive"),
  };

  try {
    if (id) await prisma.calculatorGroup.update({ where: { id }, data });
    else await prisma.calculatorGroup.create({ data });
  } catch (error) {
    console.error("[calculator] saveCalculatorGroup", error);
    return { error: "Could not save this question." };
  }

  await logActivity(session.id, id ? "update" : "create", "CalculatorGroup", id || undefined, label);
  refresh();
  return { ok: true, message: "Question saved." };
}

export async function deleteCalculatorGroup(id: string): Promise<void> {
  const session = await requirePermission("website", "write");
  // Options cascade with the group, so the estimate can never reference an
  // answer whose question is gone.
  await prisma.calculatorGroup.delete({ where: { id } });
  await logActivity(session.id, "delete", "CalculatorGroup", id);
  refresh();
}

// ------------------------------------------------------------------- options

export async function saveCalculatorOption(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("website", "write");
  const id = str(form, "id");
  const groupId = str(form, "groupId");
  const label = str(form, "label");

  if (!groupId) return { error: "Missing the question this answer belongs to." };
  if (!label) return { error: "The answer needs a label." };

  const data = {
    groupId,
    label,
    help: str(form, "help"),
    price: Math.max(0, int(form, "price")),
    // 100 means "no change"; the field is a percentage of the running subtotal.
    percent: Math.max(1, Math.min(500, int(form, "percent", 100))),
    order: int(form, "order"),
    isDefault: bool(form, "isDefault"),
  };

  try {
    if (id) await prisma.calculatorOption.update({ where: { id }, data });
    else await prisma.calculatorOption.create({ data });
  } catch (error) {
    console.error("[calculator] saveCalculatorOption", error);
    return { error: "Could not save this answer." };
  }

  await logActivity(session.id, id ? "update" : "create", "CalculatorOption", id || undefined, label);
  refresh();
  return { ok: true, message: "Answer saved." };
}

export async function deleteCalculatorOption(id: string): Promise<void> {
  const session = await requirePermission("website", "write");
  await prisma.calculatorOption.delete({ where: { id } });
  await logActivity(session.id, "delete", "CalculatorOption", id);
  refresh();
}
