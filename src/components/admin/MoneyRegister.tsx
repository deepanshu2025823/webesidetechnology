"use client";

import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { BellRing, Check, Plus, RefreshCw, Trash2 } from "lucide-react";
import { deleteExpense, saveExpense, settleExpense, type ActionState } from "@/app/admin/actions/finance";
import { Alert, Badge, Card, SubmitButton, inputClass } from "@/components/admin/ui";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export type MoneyRow = {
  id: string;
  direction: "INCOME" | "EXPENSE";
  title: string;
  category: string;
  amount: number;
  vendor: string;
  paymentMode: string;
  reference: string;
  spentAt: string;
  dueDate: string | null;
  isSettled: boolean;
  remind: boolean;
  remindDaysBefore: number;
  recurrence: string;
  clientName: string | null;
  projectName: string | null;
};

/**
 * Categories are per direction — "Ad spend" is never income, and "Training fee"
 * is never a cost — so the picker only offers what makes sense for the entry
 * being written.
 */
const CATEGORIES: Record<"INCOME" | "EXPENSE", string[]> = {
  EXPENSE: [
    "General",
    "Salary & payroll",
    "Ad spend",
    "Software & subscriptions",
    "Hosting & domains",
    "Contractor / freelancer",
    "Rent & utilities",
    "Travel",
    "Office & equipment",
    "Marketing",
    "Statutory & tax",
    "Bank charges",
  ],
  INCOME: [
    "Project payment",
    "Retainer",
    "Training & academy fee",
    "Placement commission",
    "AMC & maintenance",
    "Domain & hosting resale",
    "Referral income",
    "Interest & refunds",
    "Other income",
  ],
};

const PAYMENT_MODES = ["", "Bank transfer", "UPI", "Cash", "Cheque", "Card", "Gateway"];

const RECURRENCES = [
  { value: "NONE", label: "One-off" },
  { value: "WEEKLY", label: "Every week" },
  { value: "MONTHLY", label: "Every month" },
  { value: "QUARTERLY", label: "Every quarter" },
  { value: "HALF_YEARLY", label: "Every 6 months" },
  { value: "YEARLY", label: "Every year" },
];

const RECURRENCE_LABELS = Object.fromEntries(RECURRENCES.map((r) => [r.value, r.label]));

/**
 * The money register: income and expenses in one ledger.
 *
 * An entry can be recorded as already settled (the common case — money that has
 * moved) or as still open, with a due date, a reminder and an optional
 * recurrence. The nightly sweep raises the reminders; settling a recurring
 * entry writes the next one.
 */
export function MoneyRegister({
  rows,
  clients,
  projects,
  services,
  editable,
  direction,
}: {
  rows: MoneyRow[];
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  services: { id: string; title: string }[];
  editable: boolean;
  /** Which tab is showing, so a new entry defaults to the same kind. */
  direction: "ALL" | "INCOME" | "EXPENSE";
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveExpense, {});
  const [adding, setAdding] = useState<"INCOME" | "EXPENSE" | null>(null);
  const [, startTransition] = useTransition();
  const formRef = useRef<HTMLFormElement>(null);

  // Closing the panel is state, so it is adjusted during render — the pattern
  // React recommends over an effect that immediately calls setState.
  const [seenState, setSeenState] = useState(state);
  if (seenState !== state) {
    setSeenState(state);
    if (state.ok) setAdding(null);
  }

  // Resetting the form is a DOM update, which is what effects are for.
  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  const income = rows.filter((r) => r.direction === "INCOME");
  const expense = rows.filter((r) => r.direction === "EXPENSE");
  const sum = (list: MoneyRow[]) => list.reduce((total, r) => total + r.amount, 0);
  const settledSum = (list: MoneyRow[]) => sum(list.filter((r) => r.isSettled));

  const inTotal = settledSum(income);
  const outTotal = settledSum(expense);
  const pending = rows.filter((r) => !r.isSettled);

  return (
    <>
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Tile label="Income received" value={formatMoney(inTotal)} sub={`${income.length} entr${income.length === 1 ? "y" : "ies"}`} tone="income" />
        <Tile label="Expenses paid" value={formatMoney(outTotal)} sub={`${expense.length} entr${expense.length === 1 ? "y" : "ies"}`} tone="expense" />
        <Tile
          label="Net"
          value={formatMoney(inTotal - outTotal)}
          sub={pending.length ? `${pending.length} still open` : "Nothing outstanding"}
          tone={inTotal - outTotal >= 0 ? "income" : "expense"}
        />
      </div>

      {editable ? (
        adding ? (
          <EntryForm
            direction={adding}
            formRef={formRef}
            action={action}
            error={state.error}
            clients={clients}
            projects={projects}
            services={services}
            onCancel={() => setAdding(null)}
          />
        ) : (
          <div className="mb-6 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={() => setAdding("INCOME")}
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              <Plus className="size-4" aria-hidden /> Record income
            </button>
            <button
              type="button"
              onClick={() => setAdding("EXPENSE")}
              className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
            >
              <Plus className="size-4" aria-hidden /> Record expense
            </button>
          </div>
        )
      ) : null}

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-navy-900/15 px-6 py-16 text-center text-slate-500">
          {direction === "INCOME"
            ? "No income recorded for this period."
            : direction === "EXPENSE"
              ? "No expenses recorded for this period."
              : "Nothing recorded for this period."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Entry</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Attributed to</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                  {editable ? <th className="px-5 py-3" /> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {rows.map((row) => {
                  const isIncome = row.direction === "INCOME";
                  return (
                    <tr key={row.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <span className="flex items-center gap-2">
                          <span
                            aria-hidden
                            className={cn("size-1.5 shrink-0 rounded-full", isIncome ? "bg-emerald-500" : "bg-rose-500")}
                          />
                          <span className="font-medium text-navy-900">{row.title}</span>
                          <span className="sr-only">{isIncome ? "Income" : "Expense"}</span>
                        </span>
                        {row.vendor || row.reference ? (
                          <span className="mt-0.5 block pl-3.5 text-xs text-slate-500">
                            {[row.vendor, row.reference].filter(Boolean).join(" · ")}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {row.category}
                        {row.recurrence !== "NONE" ? (
                          <span className="mt-0.5 flex items-center gap-1 text-[11px] text-slate-400">
                            <RefreshCw className="size-3" aria-hidden />
                            {RECURRENCE_LABELS[row.recurrence] ?? row.recurrence}
                          </span>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {[row.clientName, row.projectName].filter(Boolean).join(" · ") || "—"}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">
                        {formatDate(row.isSettled ? row.spentAt : (row.dueDate ?? row.spentAt))}
                        {!row.isSettled && row.dueDate ? <span className="block text-[11px]">due</span> : null}
                      </td>
                      <td className="px-5 py-3.5">
                        {row.isSettled ? (
                          <Badge tone="success">{isIncome ? "Received" : "Paid"}</Badge>
                        ) : (
                          <span className="flex items-center gap-1.5">
                            <Badge tone="warn">{isIncome ? "Expected" : "Due"}</Badge>
                            {row.remind ? (
                              <BellRing
                                className="size-3.5 text-gold-600"
                                aria-label={`Reminder ${row.remindDaysBefore} day(s) before`}
                              />
                            ) : null}
                          </span>
                        )}
                      </td>
                      <td
                        className={cn(
                          "px-5 py-3.5 text-right font-medium tabular-nums",
                          isIncome ? "text-emerald-700" : "text-navy-900",
                        )}
                      >
                        {isIncome ? "+" : "−"}
                        {formatMoney(row.amount)}
                      </td>
                      {editable ? (
                        <td className="px-5 py-3.5">
                          <div className="flex items-center justify-end gap-1">
                            {row.isSettled ? null : (
                              <button
                                type="button"
                                onClick={() => startTransition(() => void settleExpense(row.id))}
                                className="rounded-lg p-2 text-slate-400 hover:bg-emerald-50 hover:text-emerald-700"
                                aria-label={`Mark ${row.title} as ${isIncome ? "received" : "paid"}`}
                                title={`Mark as ${isIncome ? "received" : "paid"}`}
                              >
                                <Check className="size-4" />
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => startTransition(() => void deleteExpense(row.id))}
                              className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600"
                              aria-label={`Delete ${row.title}`}
                            >
                              <Trash2 className="size-4" />
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
      )}
    </>
  );
}

function Tile({
  label,
  value,
  sub,
  tone,
}: {
  label: string;
  value: string;
  sub: string;
  tone: "income" | "expense";
}) {
  return (
    <div className="rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm">
      <p className="text-xs font-medium uppercase tracking-wide text-slate-500">{label}</p>
      <p className={cn("mt-1.5 text-2xl font-semibold", tone === "income" ? "text-emerald-700" : "text-navy-900")}>
        {value}
      </p>
      <p className="mt-1 text-xs text-slate-500">{sub}</p>
    </div>
  );
}

function EntryForm({
  direction,
  formRef,
  action,
  error,
  clients,
  projects,
  services,
  onCancel,
}: {
  direction: "INCOME" | "EXPENSE";
  formRef: React.RefObject<HTMLFormElement | null>;
  action: (formData: FormData) => void;
  error?: string;
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
  services: { id: string; title: string }[];
  onCancel: () => void;
}) {
  const isIncome = direction === "INCOME";
  const [settled, setSettled] = useState(true);

  return (
    <Card title={isIncome ? "Record income" : "Record expense"} className="mb-6">
      <form ref={formRef} action={action} className="space-y-4">
        {error ? <Alert tone="error">{error}</Alert> : null}
        <input type="hidden" name="direction" value={direction} />

        <div className="grid gap-3 sm:grid-cols-12">
          <input
            name="title"
            required
            placeholder={isIncome ? "What was it for?" : "What was it for?"}
            className={`${inputClass} sm:col-span-6`}
          />
          <input name="amount" type="number" min={1} required placeholder="Amount ₹" className={`${inputClass} sm:col-span-3`} />
          <input
            name="spentAt"
            type="date"
            className={`${inputClass} sm:col-span-3`}
            aria-label={isIncome ? "Received on" : "Paid on"}
          />

          <select name="category" defaultValue={CATEGORIES[direction][0]} className={`${inputClass} sm:col-span-3`} aria-label="Category">
            {CATEGORIES[direction].map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <input
            name="vendor"
            placeholder={isIncome ? "Received from" : "Paid to"}
            className={`${inputClass} sm:col-span-3`}
          />
          <select name="paymentMode" defaultValue="" className={`${inputClass} sm:col-span-3`} aria-label="Payment mode">
            {PAYMENT_MODES.map((m) => (
              <option key={m} value={m}>
                {m || "Payment mode"}
              </option>
            ))}
          </select>
          <input name="reference" placeholder="Reference / UTR" className={`${inputClass} sm:col-span-3`} />

          <select name="clientId" defaultValue="" className={`${inputClass} sm:col-span-4`} aria-label="Client">
            <option value="">No client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select name="projectId" defaultValue="" className={`${inputClass} sm:col-span-4`} aria-label="Project">
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

          <input name="notes" placeholder="Notes" className={`${inputClass} sm:col-span-12`} />
        </div>

        <div className="rounded-xl border border-navy-900/10 bg-slate-50/70 p-4">
          <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
            <label className="flex items-center gap-2 text-sm font-medium text-navy-900">
              <input
                type="radio"
                name="isSettled"
                value="true"
                checked={settled}
                onChange={() => setSettled(true)}
                className="size-4 text-gold-600 focus:ring-gold-500"
              />
              {isIncome ? "Already received" : "Already paid"}
            </label>
            <label className="flex items-center gap-2 text-sm font-medium text-navy-900">
              <input
                type="radio"
                name="isSettled"
                value="false"
                checked={!settled}
                onChange={() => setSettled(false)}
                className="size-4 text-gold-600 focus:ring-gold-500"
              />
              {isIncome ? "Expected later" : "Due later"}
            </label>
          </div>

          {settled ? null : (
            <div className="mt-4 grid gap-3 sm:grid-cols-12">
              <label className="sm:col-span-3">
                <span className="mb-1 block text-xs font-medium text-slate-600">Due date</span>
                <input name="dueDate" type="date" required className={inputClass} />
              </label>
              <label className="sm:col-span-3">
                <span className="mb-1 block text-xs font-medium text-slate-600">Repeats</span>
                <select name="recurrence" defaultValue="NONE" className={inputClass}>
                  {RECURRENCES.map((r) => (
                    <option key={r.value} value={r.value}>
                      {r.label}
                    </option>
                  ))}
                </select>
              </label>
              <label className="sm:col-span-3">
                <span className="mb-1 block text-xs font-medium text-slate-600">Remind days before</span>
                <input name="remindDaysBefore" type="number" min={0} max={90} defaultValue={3} className={inputClass} />
              </label>
              <label className="flex items-end gap-2 pb-2 text-sm text-navy-900 sm:col-span-3">
                <input
                  type="checkbox"
                  name="remind"
                  defaultChecked
                  className="size-4 rounded border-navy-900/25 text-gold-600 focus:ring-gold-500"
                />
                Remind the team
              </label>
            </div>
          )}
        </div>

        <div className="flex gap-3">
          <SubmitButton>{isIncome ? "Save income" : "Save expense"}</SubmitButton>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-medium text-navy-800 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
