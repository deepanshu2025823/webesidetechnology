"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, Plus, Receipt, RefreshCw, Trash2, X } from "lucide-react";
import {
  deleteRenewal,
  invoiceRenewal,
  markRenewalLost,
  markRenewed,
  saveRenewal,
  type ActionState,
} from "@/app/admin/actions/renewals";
import { Alert, Badge, Card, SubmitButton, Toggle, inputClass } from "@/components/admin/ui";
import { cn, formatDate, formatMoney } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  type: string;
  provider: string;
  identifier: string;
  expiryDate: string;
  amount: number;
  status: string;
  balance: number | null;
  balanceThreshold: number | null;
  clientId: string;
  clientName: string;
  ownerName: string | null;
  daysLeft: number;
};

const TYPES = [
  ["DOMAIN", "Domain"],
  ["HOSTING", "Hosting / server"],
  ["SSL", "SSL / security"],
  ["AMC", "Maintenance / AMC"],
  ["SEO_RETAINER", "SEO retainer"],
  ["SOCIAL_RETAINER", "Social retainer"],
  ["AD_MANAGEMENT", "Ad management"],
  ["API", "API subscription"],
  ["WHATSAPP", "WhatsApp"],
  ["SMS", "SMS"],
  ["IVR", "IVR"],
  ["OTHER", "Other"],
];

const STATUS_TONE = { ACTIVE: "success", DUE: "warn", RENEWED: "success", LOST: "muted", CANCELLED: "muted" } as const;
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export function RenewalManager({
  rows,
  clients,
  projects,
  owners,
  editable,
  canInvoice,
}: {
  rows: Row[];
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  owners: { id: string; name: string }[];
  editable: boolean;
  canInvoice: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveRenewal, {});
  const [adding, setAdding] = useState(false);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Closing the panel is state, so it is adjusted during render — the pattern
  // React recommends over an effect that immediately calls setState.
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    if (state.ok) setAdding(false);
  }

  // Resetting the form is a DOM update, which is what effects are for.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <>
      {editable ? (
        adding ? (
          <Card title="New renewal" className="mb-6">
            <form ref={formRef} action={action} className="space-y-4">
              {state.error ? <Alert tone="error">{state.error}</Alert> : null}

              <div className="grid gap-3 sm:grid-cols-12">
                <input name="name" required placeholder="e.g. sahabindia.com" className={`${inputClass} sm:col-span-5`} />
                <select name="type" defaultValue="DOMAIN" className={`${inputClass} sm:col-span-3`} aria-label="Type">
                  {TYPES.map(([v, l]) => (
                    <option key={v} value={v}>
                      {l}
                    </option>
                  ))}
                </select>
                <select name="clientId" required defaultValue="" className={`${inputClass} sm:col-span-4`} aria-label="Client">
                  <option value="">Select a client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>

                <input name="provider" placeholder="Provider" className={`${inputClass} sm:col-span-3`} />
                <input name="identifier" placeholder="Account / reference" className={`${inputClass} sm:col-span-3`} />
                <input name="expiryDate" type="date" required className={`${inputClass} sm:col-span-3`} aria-label="Expiry date" />
                <input name="amount" type="number" min={0} placeholder="Amount ₹" className={`${inputClass} sm:col-span-3`} />

                <select name="projectId" defaultValue="" className={`${inputClass} sm:col-span-4`} aria-label="Project">
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select name="ownerId" defaultValue="" className={`${inputClass} sm:col-span-4`} aria-label="Owner">
                  <option value="">Me</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.name}
                    </option>
                  ))}
                </select>
                <input
                  name="reminderDays"
                  defaultValue="90,60,30,15,7,1"
                  className={`${inputClass} sm:col-span-4`}
                  aria-label="Reminder days"
                  placeholder="Reminder days"
                />

                <input name="balance" type="number" placeholder="Wallet balance ₹ (optional)" className={`${inputClass} sm:col-span-6`} />
                <input name="balanceThreshold" type="number" placeholder="Alert below ₹ (optional)" className={`${inputClass} sm:col-span-6`} />
                <input name="notes" placeholder="Notes" className={`${inputClass} sm:col-span-12`} />
              </div>

              <Toggle name="autoRemind" label="Send automatic reminders" defaultChecked />

              <div className="flex gap-3">
                <SubmitButton>Save renewal</SubmitButton>
                <button
                  type="button"
                  onClick={() => setAdding(false)}
                  className="rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-medium text-navy-800 hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </Card>
        ) : (
          <button
            type="button"
            onClick={() => setAdding(true)}
            className="mb-6 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Plus className="size-4" aria-hidden /> Add renewal
          </button>
        )
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Renewal</th>
                <th className="px-5 py-3 font-medium">Client</th>
                <th className="px-5 py-3 font-medium">Expires</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
                {editable ? <th className="px-5 py-3 text-right font-medium">Actions</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-900/5">
              {rows.map((row) => {
                const overdue = row.daysLeft < 0;
                const soon = row.daysLeft >= 0 && row.daysLeft <= 30;
                const lowBalance =
                  row.balance !== null && row.balanceThreshold !== null && row.balance <= row.balanceThreshold;

                return (
                  <tr key={row.id} className={cn("hover:bg-slate-50/70", overdue && "bg-red-50/40")}>
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-navy-900">{row.name}</span>
                      <span className="block text-xs text-slate-500">
                        {pretty(row.type)}
                        {row.provider ? ` · ${row.provider}` : ""}
                      </span>
                      {lowBalance ? (
                        <Badge tone="warn">balance ₹{row.balance?.toLocaleString("en-IN")}</Badge>
                      ) : null}
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/clients/${row.clientId}`} className="text-slate-600 hover:text-gold-700">
                        {row.clientName}
                      </Link>
                      <span className="block text-xs text-slate-400">{row.ownerName ?? "Unassigned"}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1.5 text-xs",
                          overdue ? "font-medium text-red-600" : soon ? "font-medium text-amber-700" : "text-slate-500",
                        )}
                      >
                        <CalendarClock className="size-3.5" aria-hidden />
                        {formatDate(row.expiryDate)}
                      </span>
                      <span className="block text-xs text-slate-400">
                        {overdue ? `${Math.abs(row.daysLeft)} days overdue` : `in ${row.daysLeft} days`}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <Badge tone={STATUS_TONE[row.status as keyof typeof STATUS_TONE]}>{pretty(row.status)}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-navy-900">{formatMoney(row.amount)}</td>

                    {editable ? (
                      <td className="px-5 py-3.5">
                        <div className="flex items-center justify-end gap-1">
                          <form action={markRenewed.bind(null, row.id)} className="flex items-center gap-1">
                            <input
                              name="months"
                              type="number"
                              min={1}
                              defaultValue={12}
                              className="w-14 rounded-lg border border-navy-900/15 px-2 py-1 text-xs"
                              aria-label="Months to extend"
                            />
                            <button
                              type="submit"
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-emerald-50 hover:text-emerald-700"
                              title="Mark renewed"
                            >
                              <RefreshCw className="size-3.5" />
                            </button>
                          </form>

                          {canInvoice ? (
                            <button
                              type="button"
                              onClick={() => startTransition(() => void invoiceRenewal(row.id))}
                              className="rounded-lg p-1.5 text-slate-500 hover:bg-navy-50 hover:text-navy-900"
                              title="Raise invoice"
                            >
                              <Receipt className="size-3.5" />
                            </button>
                          ) : null}

                          <button
                            type="button"
                            onClick={() => startTransition(() => void markRenewalLost(row.id))}
                            className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                            title="Mark lost"
                          >
                            <X className="size-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={() => startTransition(() => void deleteRenewal(row.id))}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            title="Delete"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    ) : null}
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}
