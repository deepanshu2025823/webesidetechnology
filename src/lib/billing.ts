/**
 * Billing cycles for quotation and invoice line items.
 *
 * Plain module rather than part of the editor component so both the print
 * document and the server-rendered detail pages can label a cycle without
 * pulling a client component into the server bundle.
 */
export const BILLING_CYCLES = [
  ["ONE_TIME", "One time"],
  ["MONTHLY", "Monthly"],
  ["QUARTERLY", "Quarterly"],
  ["HALF_YEARLY", "Half-yearly"],
  ["ANNUAL", "Annually"],
] as const;

export type BillingCycleValue = (typeof BILLING_CYCLES)[number][0];

const LABELS = new Map<string, string>(BILLING_CYCLES);

/** Falls back to the raw value so an unknown cycle never renders as blank. */
export function billingCycleLabel(cycle: string | null | undefined): string {
  if (!cycle) return LABELS.get("ONE_TIME")!;
  return LABELS.get(cycle) ?? cycle.charAt(0) + cycle.slice(1).toLowerCase().replace(/_/g, " ");
}

/** Guards form input before it reaches the database enum column. */
export function toBillingCycle(value: unknown): BillingCycleValue {
  const raw = String(value ?? "").toUpperCase();
  return (BILLING_CYCLES.find(([v]) => v === raw)?.[0] ?? "ONE_TIME") as BillingCycleValue;
}
