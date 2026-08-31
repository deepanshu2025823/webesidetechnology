"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { CheckCircle2, ChevronDown, Plus, Trash2 } from "lucide-react";
import {
  approveAdCampaign,
  deleteAdCampaign,
  recordAdPerformance,
  saveAdCampaign,
  setAdCampaignStatus,
  type ActionState,
} from "@/app/admin/actions/campaigns";
import { Alert, Badge, Card, SubmitButton, inputClass } from "@/components/admin/ui";
import { cn, formatMoney } from "@/lib/utils";
import { personLabel, type Person } from "@/components/admin/people";

type Row = {
  id: string;
  name: string;
  platform: string;
  objective: string;
  status: string;
  budget: number;
  managementFee: number;
  clientId: string;
  clientName: string;
  ownerName: string | null;
  spend: number;
  leads: number;
  conversions: number;
  revenue: number;
};

const PLATFORMS = [
  ["META", "Meta"],
  ["GOOGLE", "Google"],
  ["YOUTUBE", "YouTube"],
  ["OTHER", "Other"],
];
const STATUSES = ["DRAFT", "PENDING_APPROVAL", "APPROVED", "ACTIVE", "PAUSED", "COMPLETED"];
const TONE = {
  DRAFT: "muted",
  PENDING_APPROVAL: "warn",
  APPROVED: "neutral",
  ACTIVE: "success",
  PAUSED: "warn",
  COMPLETED: "muted",
} as const;
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export function AdCampaignManager({
  rows,
  clients,
  owners,
  editable,
}: {
  rows: Row[];
  clients: { id: string; name: string }[];
  owners: Person[];
  editable: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveAdCampaign, {});
  const [adding, setAdding] = useState(false);
  const [openPerf, setOpenPerf] = useState<string | null>(null);
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
          <Card title="New campaign" className="mb-6">
            <form ref={formRef} action={action} className="space-y-4">
              {state.error ? <Alert tone="error">{state.error}</Alert> : null}

              <div className="grid gap-3 sm:grid-cols-12">
                <input name="name" required placeholder="Campaign name" className={`${inputClass} sm:col-span-5`} />
                <select name="platform" defaultValue="META" className={`${inputClass} sm:col-span-3`} aria-label="Platform">
                  {PLATFORMS.map(([v, l]) => (
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

                <input name="objective" placeholder="Objective (Leads, Sales…)" className={`${inputClass} sm:col-span-3`} />
                <input name="budget" type="number" min={0} placeholder="Budget ₹" className={`${inputClass} sm:col-span-3`} />
                <input name="managementFee" type="number" min={0} placeholder="Management fee ₹" className={`${inputClass} sm:col-span-3`} />
                <select name="ownerId" defaultValue="" className={`${inputClass} sm:col-span-3`} aria-label="Owner">
                  <option value="">Me</option>
                  {owners.map((o) => (
                    <option key={o.id} value={o.id}>
                      {personLabel(o)}
                    </option>
                  ))}
                </select>

                <input name="startDate" type="date" className={`${inputClass} sm:col-span-3`} aria-label="Start date" />
                <input name="endDate" type="date" className={`${inputClass} sm:col-span-3`} aria-label="End date" />
                <input name="landingUrl" placeholder="Landing page" className={`${inputClass} sm:col-span-6`} />
                <input name="creativeNotes" placeholder="Creative dependencies" className={`${inputClass} sm:col-span-12`} />
              </div>

              <div className="flex gap-3">
                <SubmitButton>Save campaign</SubmitButton>
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
            <Plus className="size-4" aria-hidden /> New campaign
          </button>
        )
      ) : null}

      <ul className="space-y-3">
        {rows.map((row) => {
          const cpl = row.leads ? Math.round(row.spend / row.leads) : 0;
          const roas = row.spend ? (row.revenue / row.spend).toFixed(2) : "—";

          return (
            <li key={row.id} className="rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-navy-900">{row.name}</p>
                  <p className="text-xs text-slate-500">
                    {pretty(row.platform)} ·{" "}
                    <Link href={`/admin/clients/${row.clientId}`} className="hover:text-gold-700">
                      {row.clientName}
                    </Link>
                    {row.ownerName ? ` · ${row.ownerName}` : ""} · {row.objective}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <Badge tone={TONE[row.status as keyof typeof TONE]}>{pretty(row.status)}</Badge>
                  {editable && row.status === "PENDING_APPROVAL" ? (
                    <button
                      type="button"
                      onClick={() => startTransition(() => void approveAdCampaign(row.id))}
                      className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
                    >
                      <CheckCircle2 className="size-3.5" aria-hidden /> Approve
                    </button>
                  ) : null}
                  {editable ? (
                    <>
                      <select
                        value={row.status}
                        onChange={(e) => startTransition(() => void setAdCampaignStatus(row.id, e.target.value))}
                        aria-label={`Status for ${row.name}`}
                        className="rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs"
                      >
                        {STATUSES.map((s) => (
                          <option key={s} value={s}>
                            {pretty(s)}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => startTransition(() => void deleteAdCampaign(row.id))}
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${row.name}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </>
                  ) : null}
                </div>
              </div>

              <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-navy-900/5 pt-4 text-sm sm:grid-cols-6">
                {[
                  ["Budget", formatMoney(row.budget)],
                  ["Spend", formatMoney(row.spend)],
                  ["Leads", String(row.leads)],
                  ["CPL", cpl ? formatMoney(cpl) : "—"],
                  ["Conversions", String(row.conversions)],
                  ["ROAS", roas],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-slate-500">{label}</dt>
                    <dd className={cn("font-medium text-navy-900", label === "CPL" && cpl > 0 && "text-gold-700")}>{value}</dd>
                  </div>
                ))}
              </dl>

              {editable ? (
                <>
                  <button
                    type="button"
                    onClick={() => setOpenPerf(openPerf === row.id ? null : row.id)}
                    className="mt-3 inline-flex items-center gap-1.5 text-xs font-semibold text-gold-700 hover:text-gold-900"
                  >
                    <ChevronDown className={cn("size-3.5 transition-transform", openPerf === row.id && "rotate-180")} aria-hidden />
                    Record performance
                  </button>

                  {openPerf === row.id ? (
                    <form
                      action={recordAdPerformance.bind(null, row.id)}
                      className="mt-3 grid gap-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4 sm:grid-cols-12"
                    >
                      <input name="date" type="date" required className={`${inputClass} sm:col-span-3`} aria-label="Date" />
                      <input name="spend" type="number" min={0} placeholder="Spend ₹" className={`${inputClass} sm:col-span-2`} />
                      <input name="impressions" type="number" min={0} placeholder="Impressions" className={`${inputClass} sm:col-span-2`} />
                      <input name="clicks" type="number" min={0} placeholder="Clicks" className={`${inputClass} sm:col-span-2`} />
                      <input name="leads" type="number" min={0} placeholder="Leads" className={`${inputClass} sm:col-span-1`} />
                      <input name="conversions" type="number" min={0} placeholder="Conv." className={`${inputClass} sm:col-span-1`} />
                      <input name="revenue" type="number" min={0} placeholder="Revenue ₹" className={`${inputClass} sm:col-span-1`} />
                      <button
                        type="submit"
                        className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-12"
                      >
                        Save day
                      </button>
                    </form>
                  ) : null}
                </>
              ) : null}
            </li>
          );
        })}
      </ul>
    </>
  );
}
