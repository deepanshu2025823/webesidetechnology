"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Check, Loader2, Minus, Plus } from "lucide-react";
import {
  emptySelection,
  estimate,
  type CalcConfig,
  type CalcGroup,
  type Selection,
} from "@/lib/calculator";
import { cn } from "@/lib/utils";

const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/**
 * Public project cost calculator.
 *
 * Questions, answers and prices all come from the admin panel, so this
 * component knows nothing about the agency's pricing — it renders whatever is
 * configured. The figure updates as you choose, and submitting sends the exact
 * same selection to the server, which recomputes the total rather than trusting
 * the number the browser displayed.
 */
export function CostCalculator({
  groups,
  config,
  ctaLabel,
  disclaimer,
}: {
  groups: CalcGroup[];
  config: CalcConfig;
  ctaLabel: string;
  disclaimer: string;
}) {
  const [selection, setSelection] = useState<Selection>(() => emptySelection(groups));
  const [sending, setSending] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");

  const result = useMemo(() => estimate(groups, selection, config), [groups, selection, config]);

  const toggle = (group: CalcGroup, optionId: string) => {
    setSelection((prev) => {
      const current = prev.options[group.id] ?? [];
      // Radio-style groups replace; checkbox-style groups add and remove.
      const next =
        group.kind === "SINGLE"
          ? [optionId]
          : current.includes(optionId)
            ? current.filter((id) => id !== optionId)
            : [...current, optionId];

      return { ...prev, options: { ...prev.options, [group.id]: next } };
    });
  };

  const setQuantity = (groupId: string, units: number) =>
    setSelection((prev) => ({
      ...prev,
      quantities: { ...prev.quantities, [groupId]: Math.max(1, Math.min(999, units)) },
    }));

  async function submit(form: FormData) {
    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/calculator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
          company: String(form.get("company") ?? ""),
          notes: String(form.get("notes") ?? ""),
          selection,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not send the estimate");
      setDone(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not send the estimate.");
    } finally {
      setSending(false);
    }
  }

  if (!groups.length) {
    return (
      <p className="rounded-2xl border border-dashed border-navy-900/20 px-6 py-14 text-center text-sm text-navy-900/60">
        The calculator is being set up. Please use the contact form in the meantime.
      </p>
    );
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr_360px] lg:items-start">
      <div className="space-y-6">
        {groups.map((group) => (
          <fieldset key={group.id} className="rounded-2xl border border-navy-900/10 bg-white p-6">
            <legend className="px-1 text-sm font-semibold uppercase tracking-wide text-navy-900">
              {group.label}
              {group.required ? <span className="text-gold-600"> *</span> : null}
            </legend>
            {group.help ? <p className="mb-4 text-sm text-navy-900/55">{group.help}</p> : null}

            {group.kind === "QUANTITY" ? (
              <QuantityGroup
                group={group}
                units={selection.quantities[group.id] ?? 1}
                selected={selection.options[group.id] ?? []}
                onToggle={(id) => toggle(group, id)}
                onUnits={(units) => setQuantity(group.id, units)}
              />
            ) : (
              <div className="grid gap-2.5 sm:grid-cols-2">
                {group.options.map((option) => {
                  const checked = (selection.options[group.id] ?? []).includes(option.id);
                  return (
                    <button
                      key={option.id}
                      type="button"
                      onClick={() => toggle(group, option.id)}
                      aria-pressed={checked}
                      className={cn(
                        "flex items-start gap-3 rounded-xl border p-4 text-left transition-colors",
                        checked
                          ? "border-gold-500 bg-gold-50"
                          : "border-navy-900/12 bg-white hover:border-gold-400 hover:bg-gold-50/40",
                      )}
                    >
                      <span
                        className={cn(
                          "mt-0.5 grid size-5 shrink-0 place-items-center border-2 transition-colors",
                          group.kind === "SINGLE" ? "rounded-full" : "rounded-md",
                          checked ? "border-gold-600 bg-gold-600 text-white" : "border-navy-900/25",
                        )}
                        aria-hidden
                      >
                        {checked ? <Check className="size-3" strokeWidth={4} /> : null}
                      </span>

                      <span className="min-w-0 flex-1">
                        <span className="block text-sm font-medium text-navy-900">{option.label}</span>
                        {option.help ? <span className="mt-0.5 block text-xs text-navy-900/50">{option.help}</span> : null}
                        <span className="mt-1 block text-xs font-semibold text-gold-700">{priceLabel(option)}</span>
                      </span>
                    </button>
                  );
                })}
              </div>
            )}
          </fieldset>
        ))}
      </div>

      {/* The running total follows the questions down the page. */}
      <aside className="lg:sticky lg:top-28">
        <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-navy-900 text-white shadow-brand">
          <div className="px-6 py-6">
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">Your estimate</p>
            <p className="mt-3 font-display text-3xl leading-tight">
              {money(result.low)}
              <span className="text-navy-200"> – </span>
              {money(result.high)}
            </p>
            <p className="mt-1.5 text-xs text-navy-200">Including {config.taxPercent}% tax</p>
          </div>

          {result.lines.length ? (
            <ul className="max-h-64 space-y-2 overflow-y-auto border-t border-white/10 px-6 py-4 text-sm">
              {config.basePrice ? (
                <li className="flex justify-between gap-4 text-navy-200">
                  <span>Project management &amp; QA</span>
                  <span className="shrink-0">{money(config.basePrice)}</span>
                </li>
              ) : null}
              {result.lines.map((line, i) => (
                <li key={`${line.detail}-${i}`} className="flex justify-between gap-4 text-navy-100">
                  <span className="min-w-0">
                    <span className="block truncate">{line.detail}</span>
                    <span className="block text-xs text-navy-300">{line.label}</span>
                  </span>
                  <span className="shrink-0">{money(line.amount)}</span>
                </li>
              ))}
            </ul>
          ) : null}

          <div className="border-t border-white/10 bg-navy-950/40 px-6 py-5">
            {done ? (
              <p className="text-sm text-gold-200">
                Sent. The team has your estimate and will come back within one working day.
              </p>
            ) : (
              <form action={submit} className="space-y-2.5">
                {result.missing.length ? (
                  <p className="rounded-lg bg-white/10 px-3 py-2 text-xs text-gold-200">
                    Still to choose: {result.missing.join(", ")}
                  </p>
                ) : null}

                <input name="name" required placeholder="Your name" className={fieldClass} autoComplete="name" />
                <input name="email" type="email" required placeholder="Email" className={fieldClass} autoComplete="email" />
                <input name="phone" placeholder="Phone" className={fieldClass} autoComplete="tel" inputMode="tel" />
                <input name="company" placeholder="Company (optional)" className={fieldClass} autoComplete="organization" />
                <textarea name="notes" rows={2} placeholder="Anything else we should know?" className={fieldClass} />

                {error ? <p className="text-xs text-red-300">{error}</p> : null}

                <button
                  type="submit"
                  disabled={sending || result.missing.length > 0}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-gold-600 px-6 py-3 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-500 disabled:opacity-50"
                >
                  {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
                  {sending ? "Sending…" : ctaLabel}
                  {!sending ? <ArrowRight className="size-4" aria-hidden /> : null}
                </button>
              </form>
            )}
          </div>
        </div>

        {disclaimer ? <p className="mt-4 text-xs leading-relaxed text-navy-900/50">{disclaimer}</p> : null}
      </aside>
    </div>
  );
}

const fieldClass =
  "w-full rounded-lg border border-white/15 bg-white/10 px-3.5 py-2.5 text-sm text-white placeholder:text-navy-300 focus:border-gold-400 focus:outline-none";

function priceLabel(option: { price: number; percent: number }) {
  if (option.percent !== 100) return `${option.percent > 100 ? "+" : ""}${option.percent - 100}%`;
  if (!option.price) return "Included";
  return `+ ${money(option.price)}`;
}

function QuantityGroup({
  group,
  units,
  selected,
  onToggle,
  onUnits,
}: {
  group: CalcGroup;
  units: number;
  selected: string[];
  onToggle: (id: string) => void;
  onUnits: (units: number) => void;
}) {
  return (
    <div className="space-y-3">
      {group.options.map((option) => {
        const checked = selected.includes(option.id);
        return (
          <div
            key={option.id}
            className={cn(
              "flex flex-wrap items-center gap-4 rounded-xl border p-4",
              checked ? "border-gold-500 bg-gold-50" : "border-navy-900/12",
            )}
          >
            <button
              type="button"
              onClick={() => onToggle(option.id)}
              aria-pressed={checked}
              className="flex min-w-0 flex-1 items-center gap-3 text-left"
            >
              <span
                className={cn(
                  "grid size-5 shrink-0 place-items-center rounded-md border-2",
                  checked ? "border-gold-600 bg-gold-600 text-white" : "border-navy-900/25",
                )}
                aria-hidden
              >
                {checked ? <Check className="size-3" strokeWidth={4} /> : null}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-medium text-navy-900">{option.label}</span>
                <span className="block text-xs font-semibold text-gold-700">{money(option.price)} each</span>
              </span>
            </button>

            {checked ? (
              <span className="flex items-center gap-1 rounded-full border border-navy-900/15 bg-white p-1">
                <Stepper label={`Fewer ${option.label}`} onClick={() => onUnits(units - 1)}>
                  <Minus className="size-3.5" />
                </Stepper>
                <span className="w-8 text-center text-sm font-semibold text-navy-900">{units}</span>
                <Stepper label={`More ${option.label}`} onClick={() => onUnits(units + 1)}>
                  <Plus className="size-3.5" />
                </Stepper>
              </span>
            ) : null}
          </div>
        );
      })}
    </div>
  );
}

function Stepper({ label, onClick, children }: { label: string; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="grid size-7 place-items-center rounded-full text-navy-800 transition-colors hover:bg-gold-100"
    >
      {children}
    </button>
  );
}
