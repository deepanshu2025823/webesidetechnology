"use client";

import { useActionState, useMemo, useState } from "react";
import { saveQuotation, type ActionState } from "@/app/admin/actions/crm";
import { Alert, Card, FieldWrap, SubmitButton, inputClass } from "@/components/admin/ui";
import { personLabel, type Person } from "@/components/admin/people";
import {
  LineItemsEditor,
  TotalsSummary,
  blankLineItem,
  lineItemTotals,
  type LineItem as Item,
} from "@/components/admin/LineItemsEditor";

type QuotationValue = {
  id: string;
  title: string;
  clientId: string;
  leadId: string | null;
  status: string;
  commercial: string;
  validUntil: string | null;
  discountPct: number;
  taxPct: number;
  terms: string | null;
  notes: string | null;
  ownerId: string | null;
  items: Item[];
};

const STATUSES = ["DRAFT", "SENT", "NEGOTIATION", "ACCEPTED", "REJECTED", "EXPIRED"];
const COMMERCIALS = [
  ["ONE_TIME", "One-time"],
  ["MONTHLY_RETAINER", "Monthly retainer"],
  ["QUARTERLY", "Quarterly"],
  ["HALF_YEARLY", "Half-yearly"],
  ["ANNUAL", "Annual"],
  ["USAGE_BASED", "Usage-based"],
  ["MILESTONE_BASED", "Milestone-based"],
];

export function QuotationForm({
  quotation,
  clients,
  services,
  owners,
  defaultClientId,
}: {
  quotation?: QuotationValue;
  clients: { id: string; name: string; code: string }[];
  services: { id: string; title: string; priceFrom: number | null }[];
  owners: Person[];
  defaultClientId?: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveQuotation, {});
  const [items, setItems] = useState<Item[]>(quotation?.items?.length ? quotation.items : [blankLineItem()]);
  const [discountPct, setDiscountPct] = useState(String(quotation?.discountPct ?? 0));
  const [taxPct, setTaxPct] = useState(String(quotation?.taxPct ?? 18));

  const totals = useMemo(() => lineItemTotals(items, discountPct, taxPct), [items, discountPct, taxPct]);

  return (
    <form action={action} className="space-y-6">
      {quotation ? <input type="hidden" name="id" value={quotation.id} /> : null}
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Quotation">
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrap label="Title" htmlFor="title" required className="sm:col-span-2">
                <input
                  id="title"
                  name="title"
                  required
                  defaultValue={quotation?.title}
                  placeholder="Website redesign + 6-month SEO"
                  className={inputClass}
                />
              </FieldWrap>

              <FieldWrap label="Client" htmlFor="clientId" required>
                <select
                  id="clientId"
                  name="clientId"
                  required
                  defaultValue={quotation?.clientId ?? defaultClientId ?? ""}
                  className={inputClass}
                >
                  <option value="">— Select a client —</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name} ({c.code})
                    </option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Commercial model" htmlFor="commercial">
                <select id="commercial" name="commercial" defaultValue={quotation?.commercial ?? "ONE_TIME"} className={inputClass}>
                  {COMMERCIALS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </FieldWrap>
            </div>
          </Card>

          <Card title="Line items" description="What the client is paying for.">
            <LineItemsEditor items={items} onChange={setItems} services={services} />
          </Card>

          <Card title="Terms & notes">
            <div className="grid gap-5">
              <FieldWrap label="Terms" htmlFor="terms" help="Payment schedule, validity, exclusions.">
                <textarea id="terms" name="terms" rows={4} defaultValue={quotation?.terms ?? ""} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="Internal notes" htmlFor="notes" help="Not shown to the client.">
                <textarea id="notes" name="notes" rows={2} defaultValue={quotation?.notes ?? ""} className={inputClass} />
              </FieldWrap>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Pricing">
            <div className="space-y-4">
              <FieldWrap label="Discount %" htmlFor="discountPct">
                <input
                  id="discountPct"
                  name="discountPct"
                  type="number"
                  min={0}
                  max={100}
                  value={discountPct}
                  onChange={(e) => setDiscountPct(e.target.value)}
                  className={inputClass}
                />
              </FieldWrap>

              <FieldWrap label="Tax %" htmlFor="taxPct" help="GST, typically 18%.">
                <input
                  id="taxPct"
                  name="taxPct"
                  type="number"
                  min={0}
                  max={100}
                  value={taxPct}
                  onChange={(e) => setTaxPct(e.target.value)}
                  className={inputClass}
                />
              </FieldWrap>

              <TotalsSummary totals={totals} />
            </div>
          </Card>

          <Card title="Status">
            <div className="space-y-4">
              <FieldWrap label="Stage" htmlFor="status">
                <select id="status" name="status" defaultValue={quotation?.status ?? "DRAFT"} className={inputClass}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
                    </option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Valid until" htmlFor="validUntil">
                <input
                  id="validUntil"
                  name="validUntil"
                  type="date"
                  defaultValue={quotation?.validUntil ?? ""}
                  className={inputClass}
                />
              </FieldWrap>

              <FieldWrap label="Owner" htmlFor="ownerId">
                <select id="ownerId" name="ownerId" defaultValue={quotation?.ownerId ?? ""} className={inputClass}>
                  <option value="">— Me —</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {personLabel(o)}
                    </option>
                  ))}
                </select>
              </FieldWrap>
            </div>
          </Card>
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-navy-900/10 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <SubmitButton>{quotation ? "Update quotation" : "Create quotation"}</SubmitButton>
      </div>
    </form>
  );
}
