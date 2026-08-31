/**
 * The estimate maths, shared by the public calculator and the server.
 *
 * The browser uses it to show a live figure while someone is choosing; the
 * submit route runs the same function over the same inputs to produce the
 * number that reaches the sales team. Keeping one implementation is what stops
 * the quote in the lead disagreeing with the quote on screen.
 *
 * No `server-only` here on purpose — this file is deliberately isomorphic.
 */

export type CalcKind = "SINGLE" | "MULTI" | "QUANTITY" | "TOGGLE";

export type CalcOption = {
  id: string;
  label: string;
  help: string;
  /** Flat rupees, or rupees per unit in a QUANTITY group. */
  price: number;
  /** Percent applied to the running subtotal; 100 leaves it unchanged. */
  percent: number;
  isDefault: boolean;
};

export type CalcGroup = {
  id: string;
  label: string;
  help: string;
  kind: CalcKind;
  required: boolean;
  options: CalcOption[];
};

export type CalcConfig = {
  basePrice: number;
  taxPercent: number;
  variancePct: number;
};

export type Selection = {
  /** groupId → chosen option ids. */
  options: Record<string, string[]>;
  /** groupId → unit count, for QUANTITY groups. */
  quantities: Record<string, number>;
};

export type EstimateLine = { label: string; detail: string; amount: number };

export type Estimate = {
  lines: EstimateLine[];
  base: number;
  subtotal: number;
  tax: number;
  total: number;
  /** Presented as a range, because a configurator cannot know the real scope. */
  low: number;
  high: number;
  /** Required groups still unanswered; the CTA stays disabled while non-empty. */
  missing: string[];
};

export function emptySelection(groups: CalcGroup[]): Selection {
  const options: Record<string, string[]> = {};
  const quantities: Record<string, number> = {};

  for (const group of groups) {
    const defaults = group.options.filter((o) => o.isDefault).map((o) => o.id);
    // A single-choice question with no default would otherwise start invalid.
    options[group.id] = group.kind === "SINGLE" ? defaults.slice(0, 1) : defaults;
    if (group.kind === "QUANTITY") quantities[group.id] = 1;
  }

  return { options, quantities };
}

/** Round to the nearest ₹500 — false precision reads as a real quote. */
function tidy(amount: number) {
  return Math.round(amount / 500) * 500;
}

export function estimate(groups: CalcGroup[], selection: Selection, config: CalcConfig): Estimate {
  const lines: EstimateLine[] = [];
  const missing: string[] = [];

  let subtotal = config.basePrice;
  // Percentage options are collected first and applied to the finished subtotal,
  // so their effect does not depend on the order the questions happen to be in.
  const multipliers: { label: string; percent: number }[] = [];

  for (const group of groups) {
    const chosen = group.options.filter((option) => selection.options[group.id]?.includes(option.id));

    if (group.required && !chosen.length) missing.push(group.label);
    if (!chosen.length) continue;

    for (const option of chosen) {
      if (group.kind === "QUANTITY") {
        const units = Math.max(1, Math.round(selection.quantities[group.id] ?? 1));
        const amount = option.price * units;
        if (amount) lines.push({ label: group.label, detail: `${option.label} × ${units}`, amount });
        subtotal += amount;
        continue;
      }

      if (option.price) {
        lines.push({ label: group.label, detail: option.label, amount: option.price });
        subtotal += option.price;
      }

      if (option.percent !== 100) multipliers.push({ label: option.label, percent: option.percent });
    }
  }

  for (const multiplier of multipliers) {
    const before = subtotal;
    subtotal = Math.round(subtotal * (multiplier.percent / 100));
    lines.push({
      label: multiplier.percent > 100 ? "Uplift" : "Discount",
      detail: `${multiplier.label} (${multiplier.percent > 100 ? "+" : ""}${multiplier.percent - 100}%)`,
      amount: subtotal - before,
    });
  }

  const tax = Math.round((subtotal * config.taxPercent) / 100);
  const total = subtotal + tax;
  const spread = config.variancePct / 100;

  return {
    lines,
    base: config.basePrice,
    subtotal,
    tax,
    total,
    low: tidy(total * (1 - spread)),
    high: tidy(total * (1 + spread)),
    missing,
  };
}

/** Human-readable breakdown, used in the lead note and the confirmation mail. */
export function summarise(groups: CalcGroup[], selection: Selection, result: Estimate): string {
  const answers = groups
    .map((group) => {
      const chosen = group.options.filter((option) => selection.options[group.id]?.includes(option.id));
      if (!chosen.length) return null;
      const units = group.kind === "QUANTITY" ? ` × ${Math.max(1, Math.round(selection.quantities[group.id] ?? 1))}` : "";
      return `${group.label}: ${chosen.map((o) => o.label).join(", ")}${units}`;
    })
    .filter(Boolean);

  const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  return [
    "Built with the website cost calculator.",
    "",
    ...answers,
    "",
    `Subtotal: ${money(result.subtotal)}`,
    `Tax: ${money(result.tax)}`,
    `Estimate: ${money(result.low)} – ${money(result.high)}`,
  ].join("\n");
}
