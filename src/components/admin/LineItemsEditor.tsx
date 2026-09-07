"use client";

import { Plus, Trash2 } from "lucide-react";
import { inputClass } from "@/components/admin/ui";
import { formatMoney } from "@/lib/utils";
import { BILLING_CYCLES } from "@/lib/billing";

export type LineItem = {
  serviceId: string;
  title: string;
  description: string;
  quantity: string;
  unitPrice: string;
  /** How often this line recurs - printed on the quotation and the invoice. */
  billingCycle: string;
};

export const blankLineItem = (): LineItem => ({
  serviceId: "",
  title: "",
  description: "",
  quantity: "1",
  unitPrice: "0",
  billingCycle: "ONE_TIME",
});

export function lineItemTotals(items: LineItem[], discountPct: string, taxPct: string) {
  const subtotal = items.reduce(
    (sum, i) => sum + Math.max(1, Number(i.quantity) || 1) * Math.max(0, Number(i.unitPrice) || 0),
    0,
  );
  const discount = Math.round(subtotal * (Math.min(100, Number(discountPct) || 0) / 100));
  const taxable = subtotal - discount;
  const tax = Math.round(taxable * (Math.min(100, Number(taxPct) || 0) / 100));
  return { subtotal, discount, tax, total: taxable + tax };
}

/** Shared between quotations and invoices so both price things identically. */
export function LineItemsEditor({
  items,
  onChange,
  services,
}: {
  items: LineItem[];
  onChange: (items: LineItem[]) => void;
  services: { id: string; title: string; priceFrom: number | null }[];
}) {
  const update = (index: number, patch: Partial<LineItem>) =>
    onChange(items.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const pickService = (index: number, serviceId: string) => {
    const service = services.find((s) => s.id === serviceId);
    update(index, {
      serviceId,
      ...(service ? { title: service.title, unitPrice: String(service.priceFrom ?? 0) } : {}),
    });
  };

  return (
    <>
      <div className="space-y-3">
        {items.map((item, index) => (
          <div key={index} className="rounded-xl border border-navy-900/10 bg-slate-50 p-4">
            <div className="mb-3 flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500">Item {index + 1}</span>
              <button
                type="button"
                onClick={() => items.length > 1 && onChange(items.filter((_, i) => i !== index))}
                disabled={items.length === 1}
                className="rounded p-1.5 text-red-600 hover:bg-red-50 disabled:opacity-30"
                aria-label={`Remove item ${index + 1}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-12">
              <div className="sm:col-span-5">
                <label className="text-xs font-medium text-slate-600">Service (optional)</label>
                <select
                  value={item.serviceId}
                  onChange={(e) => pickService(index, e.target.value)}
                  className={`${inputClass} mt-1`}
                >
                  <option value="">— Custom line —</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-7">
                <label className="text-xs font-medium text-slate-600">Description</label>
                <input
                  value={item.title}
                  onChange={(e) => update(index, { title: e.target.value })}
                  placeholder="What this covers"
                  className={`${inputClass} mt-1`}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="text-xs font-medium text-slate-600">Qty</label>
                <input
                  type="number"
                  min={1}
                  value={item.quantity}
                  onChange={(e) => update(index, { quantity: e.target.value })}
                  className={`${inputClass} mt-1`}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-medium text-slate-600">Unit price (₹)</label>
                <input
                  type="number"
                  min={0}
                  value={item.unitPrice}
                  onChange={(e) => update(index, { unitPrice: e.target.value })}
                  className={`${inputClass} mt-1`}
                />
              </div>

              <div className="sm:col-span-3">
                <label className="text-xs font-medium text-slate-600">Duration</label>
                <select
                  value={item.billingCycle || "ONE_TIME"}
                  onChange={(e) => update(index, { billingCycle: e.target.value })}
                  className={`${inputClass} mt-1`}
                >
                  {BILLING_CYCLES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </div>

              <div className="sm:col-span-4">
                <label className="text-xs font-medium text-slate-600">Amount</label>
                <p className="mt-1 rounded-xl border border-navy-900/10 bg-white px-3.5 py-2.5 text-sm font-medium text-navy-900">
                  {formatMoney(Math.max(1, Number(item.quantity) || 1) * Math.max(0, Number(item.unitPrice) || 0))}
                </p>
              </div>
            </div>
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={() => onChange([...items, blankLineItem()])}
        className="mt-3 inline-flex items-center gap-2 rounded-lg border border-dashed border-navy-900/25 px-4 py-2.5 text-sm font-medium text-navy-800 hover:border-gold-500 hover:bg-gold-50"
      >
        <Plus className="size-4" aria-hidden /> Add line item
      </button>
    </>
  );
}

/** Subtotal / discount / tax / total block shared by both documents. */
export function TotalsSummary({ totals }: { totals: ReturnType<typeof lineItemTotals> }) {
  return (
    <dl className="space-y-2 border-t border-navy-900/10 pt-4 text-sm">
      <div className="flex justify-between">
        <dt className="text-slate-500">Subtotal</dt>
        <dd className="text-navy-900">{formatMoney(totals.subtotal)}</dd>
      </div>
      {totals.discount ? (
        <div className="flex justify-between">
          <dt className="text-slate-500">Discount</dt>
          <dd className="text-navy-900">− {formatMoney(totals.discount)}</dd>
        </div>
      ) : null}
      <div className="flex justify-between">
        <dt className="text-slate-500">Tax</dt>
        <dd className="text-navy-900">{formatMoney(totals.tax)}</dd>
      </div>
      <div className="flex justify-between border-t border-navy-900/10 pt-2">
        <dt className="font-semibold text-navy-900">Total</dt>
        <dd className="font-display text-xl text-navy-900">{formatMoney(totals.total)}</dd>
      </div>
    </dl>
  );
}
