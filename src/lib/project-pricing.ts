/**
 * What a client project charges, split the way it is actually billed: a
 * one-time project fee, a recurring subscription and a recurring maintenance
 * charge, each with or without GST.
 */

export const CYCLES = [
  ["MONTHLY", "per month", 1],
  ["QUARTERLY", "per quarter", 3],
  ["HALF_YEARLY", "per half-year", 6],
  ["ANNUAL", "per year", 12],
] as const;

export const GST_MODES = [
  ["NONE", "No GST"],
  ["EXCLUSIVE", "Add GST on top"],
  ["INCLUSIVE", "Prices include GST"],
] as const;

export type GstMode = (typeof GST_MODES)[number][0];

export function cycleLabel(cycle: string) {
  return CYCLES.find(([v]) => v === cycle)?.[1] ?? "per month";
}

/** Base, tax and total for one amount under the project's GST setting. */
export function withGst(amount: number, mode: string, rate: number) {
  const r = Math.max(0, rate) / 100;
  if (!amount || mode === "NONE" || !r) return { base: amount, gst: 0, total: amount };
  if (mode === "INCLUSIVE") {
    const base = Math.round(amount / (1 + r));
    return { base, gst: amount - base, total: amount };
  }
  const gst = Math.round(amount * r);
  return { base: amount, gst, total: amount + gst };
}

export type PricingInput = {
  projectCost: number;
  subscriptionCost: number;
  subscriptionCycle: string;
  maintenanceCost: number;
  maintenanceCycle: string;
  gstMode: string;
  gstRate: number;
};

/** The three lines as they should be shown, skipping any left at zero. */
export function pricingLines(p: PricingInput) {
  return [
    { key: "project", label: "Project cost", note: "one-time", amount: p.projectCost },
    { key: "subscription", label: "Subscription", note: cycleLabel(p.subscriptionCycle), amount: p.subscriptionCost },
    { key: "maintenance", label: "Maintenance", note: cycleLabel(p.maintenanceCycle), amount: p.maintenanceCost },
  ]
    .filter((line) => line.amount > 0)
    .map((line) => ({ ...line, ...withGst(line.amount, p.gstMode, p.gstRate) }));
}
