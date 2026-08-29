"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { deleteExpense, saveExpense, type ActionState } from "@/app/admin/actions/finance";
import { Alert, Card, SubmitButton, inputClass } from "@/components/admin/ui";
import { formatDate, formatMoney } from "@/lib/utils";

type Row = {
  id: string;
  title: string;
  category: string;
  amount: number;
  vendor: string;
  spentAt: string;
  clientName: string | null;
  projectName: string | null;
};

const CATEGORIES = [
  "General",
  "Ad spend",
  "Software",
  "Hosting & domains",
  "Contractor",
  "Travel",
  "Office",
  "Marketing",
];

export function ExpenseManager({
  rows,
  clients,
  projects,
  services,
  editable,
}: {
  rows: Row[];
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  services: { id: string; title: string }[];
  editable: boolean;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveExpense, {});
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

  const total = rows.reduce((sum, r) => sum + r.amount, 0);

  return (
    <>
      {editable ? (
        adding ? (
          <Card title="New expense" className="mb-6">
            <form ref={formRef} action={action} className="space-y-4">
              {state.error ? <Alert tone="error">{state.error}</Alert> : null}

              <div className="grid gap-3 sm:grid-cols-12">
                <input name="title" required placeholder="What was it for?" className={`${inputClass} sm:col-span-6`} />
                <input name="amount" type="number" min={1} required placeholder="Amount ₹" className={`${inputClass} sm:col-span-3`} />
                <input name="spentAt" type="date" className={`${inputClass} sm:col-span-3`} aria-label="Date" />

                <select name="category" defaultValue="General" className={`${inputClass} sm:col-span-3`} aria-label="Category">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {c}
                    </option>
                  ))}
                </select>
                <input name="vendor" placeholder="Vendor" className={`${inputClass} sm:col-span-3`} />
                <select name="clientId" defaultValue="" className={`${inputClass} sm:col-span-3`} aria-label="Client">
                  <option value="">No client</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <select name="projectId" defaultValue="" className={`${inputClass} sm:col-span-3`} aria-label="Project">
                  <option value="">No project</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
                <select name="serviceId" defaultValue="" className={`${inputClass} sm:col-span-4`} aria-label="Service">
                  <option value="">No service</option>
                  {services.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.title}
                    </option>
                  ))}
                </select>
                <input name="notes" placeholder="Notes" className={`${inputClass} sm:col-span-8`} />
              </div>

              <div className="flex gap-3">
                <SubmitButton>Save expense</SubmitButton>
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
            <Plus className="size-4" aria-hidden /> Record expense
          </button>
        )
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Expense</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium">Attributed to</th>
                <th className="px-5 py-3 font-medium">Date</th>
                <th className="px-5 py-3 text-right font-medium">Amount</th>
                {editable ? <th className="px-5 py-3" /> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-900/5">
              {rows.map((row) => (
                <tr key={row.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-navy-900">{row.title}</span>
                    {row.vendor ? <span className="block text-xs text-slate-500">{row.vendor}</span> : null}
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{row.category}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    {[row.clientName, row.projectName].filter(Boolean).join(" · ") || "—"}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">{formatDate(row.spentAt)}</td>
                  <td className="px-5 py-3.5 text-right font-medium text-navy-900">{formatMoney(row.amount)}</td>
                  {editable ? (
                    <td className="px-5 py-3.5 text-right">
                      <button
                        type="button"
                        onClick={() => startTransition(() => void deleteExpense(row.id))}
                        className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${row.title}`}
                      >
                        <Trash2 className="size-4" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-navy-900/10 bg-slate-50">
              <tr>
                <td colSpan={4} className="px-5 py-3 text-xs uppercase tracking-wide text-slate-500">
                  Total
                </td>
                <td className="px-5 py-3 text-right font-semibold text-navy-900">{formatMoney(total)}</td>
                {editable ? <td /> : null}
              </tr>
            </tfoot>
          </table>
        </div>
      </div>
    </>
  );
}
