"use client";

import { useActionState, useMemo, useState } from "react";
import { saveInvoice, type ActionState } from "@/app/admin/actions/finance";
import { Alert, Card, FieldWrap, SubmitButton, inputClass } from "@/components/admin/ui";
import {
  LineItemsEditor,
  TotalsSummary,
  blankLineItem,
  lineItemTotals,
  type LineItem,
} from "@/components/admin/LineItemsEditor";

type InvoiceValue = {
  id: string;
  title: string;
  clientId: string;
  projectId: string | null;
  kind: string;
  status: string;
  issueDate: string | null;
  dueDate: string | null;
  discountPct: number;
  taxPct: number;
  terms: string | null;
  notes: string | null;
  ownerId: string | null;
  items: LineItem[];
};

const KINDS = [
  ["STANDARD", "Standard"],
  ["PROFORMA", "Proforma"],
  ["MILESTONE", "Milestone"],
  ["RECURRING", "Recurring"],
];

const STATUSES = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export function InvoiceForm({
  invoice,
  clients,
  projects,
  services,
  owners,
  defaultClientId,
}: {
  invoice?: InvoiceValue;
  clients: { id: string; name: string; code: string }[];
  projects: { id: string; name: string; clientId: string }[];
  services: { id: string; title: string; priceFrom: number | null }[];
  owners: { id: string; name: string }[];
  defaultClientId?: string;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveInvoice, {});
  const [items, setItems] = useState<LineItem[]>(invoice?.items?.length ? invoice.items : [blankLineItem()]);
  const [discountPct, setDiscountPct] = useState(String(invoice?.discountPct ?? 0));
  const [taxPct, setTaxPct] = useState(String(invoice?.taxPct ?? 18));
  const [clientId, setClientId] = useState(invoice?.clientId ?? defaultClientId ?? "");

  const totals = useMemo(() => lineItemTotals(items, discountPct, taxPct), [items, discountPct, taxPct]);
  const clientProjects = projects.filter((p) => p.clientId === clientId);

  return (
    <form action={action} className="space-y-6">
      {invoice ? <input type="hidden" name="id" value={invoice.id} /> : null}
      <input type="hidden" name="items" value={JSON.stringify(items)} />
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="Invoice">
            <div className="grid gap-5 sm:grid-cols-2">
              <FieldWrap label="Title" htmlFor="title" required className="sm:col-span-2">
                <input id="title" name="title" required defaultValue={invoice?.title} className={inputClass} />
              </FieldWrap>

              <FieldWrap label="Client" htmlFor="clientId" required>
                <select
                  id="clientId"
                  name="clientId"
                  required
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
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

              <FieldWrap label="Project" htmlFor="projectId" help="Links the invoice to delivery and profitability.">
                <select id="projectId" name="projectId" defaultValue={invoice?.projectId ?? ""} className={inputClass}>
                  <option value="">— Not project specific —</option>
                  {clientProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Type" htmlFor="kind">
                <select id="kind" name="kind" defaultValue={invoice?.kind ?? "STANDARD"} className={inputClass}>
                  {KINDS.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
              </FieldWrap>

              <FieldWrap label="Status" htmlFor="status">
                <select id="status" name="status" defaultValue={invoice?.status ?? "DRAFT"} className={inputClass}>
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {pretty(s)}
                    </option>
                  ))}
                </select>
              </FieldWrap>
            </div>
          </Card>

          <Card title="Line items">
            <LineItemsEditor items={items} onChange={setItems} services={services} />
          </Card>

          <Card title="Terms & notes">
            <div className="grid gap-5">
              <FieldWrap label="Terms" htmlFor="terms">
                <textarea id="terms" name="terms" rows={3} defaultValue={invoice?.terms ?? ""} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="Internal notes" htmlFor="notes">
                <textarea id="notes" name="notes" rows={2} defaultValue={invoice?.notes ?? ""} className={inputClass} />
              </FieldWrap>
            </div>
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Dates">
            <div className="space-y-4">
              <FieldWrap label="Issue date" htmlFor="issueDate">
                <input
                  id="issueDate"
                  name="issueDate"
                  type="date"
                  defaultValue={invoice?.issueDate ?? new Date().toISOString().slice(0, 10)}
                  className={inputClass}
                />
              </FieldWrap>
              <FieldWrap label="Due date" htmlFor="dueDate">
                <input id="dueDate" name="dueDate" type="date" defaultValue={invoice?.dueDate ?? ""} className={inputClass} />
              </FieldWrap>
              <FieldWrap label="Owner" htmlFor="ownerId">
                <select id="ownerId" name="ownerId" defaultValue={invoice?.ownerId ?? ""} className={inputClass}>
                  <option value="">— Me —</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
              </FieldWrap>
            </div>
          </Card>

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
        </div>
      </div>

      <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-navy-900/10 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <SubmitButton>{invoice ? "Update invoice" : "Create invoice"}</SubmitButton>
      </div>
    </form>
  );
}
