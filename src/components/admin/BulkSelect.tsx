"use client";

import { createContext, useContext, useState, useTransition } from "react";
import { Loader2, X } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Tick rows in an admin table and run one action over all of them.
 *
 * The table itself stays a server component: only the checkboxes and the bar
 * are client-side, sharing the selection through this context.
 */

type Ctx = { all: string[]; selected: Set<string>; toggle: (id: string) => void; setAll: (on: boolean) => void };
const BulkContext = createContext<Ctx | null>(null);

function useBulk() {
  const ctx = useContext(BulkContext);
  if (!ctx) throw new Error("Bulk controls must sit inside <BulkSelect>");
  return ctx;
}

/**
 * One button in the bar. Actions sharing a `group` collapse into a single
 * dropdown named after it — "Move to stage…", "Assign to…" — so a list with a
 * dozen targets does not become a dozen buttons.
 */
export type BulkAction = { value: string; label: string; danger?: boolean; group?: string };

export function BulkSelect({
  ids,
  actions,
  run,
  noun = ["item", "items"],
  children,
}: {
  ids: string[];
  actions: BulkAction[];
  run: (ids: string[], action: string) => Promise<{ error?: string; message?: string }>;
  noun?: [string, string];
  children: React.ReactNode;
}) {
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirming, setConfirming] = useState<BulkAction | null>(null);
  const [notice, setNotice] = useState<{ error?: string; message?: string }>({});
  const [pending, startTransition] = useTransition();

  // Rows can disappear after an action; never act on ids no longer listed.
  const live = new Set([...selected].filter((id) => ids.includes(id)));

  const ctx: Ctx = {
    all: ids,
    selected: live,
    toggle: (id) =>
      setSelected((prev) => {
        const next = new Set(prev);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
    setAll: (on) => setSelected(on ? new Set(ids) : new Set()),
  };

  function execute(action: BulkAction) {
    if (action.danger && confirming?.value !== action.value) {
      setConfirming(action);
      return;
    }
    setConfirming(null);
    startTransition(async () => {
      const result = await run([...live], action.value);
      setNotice(result);
      if (!result.error) setSelected(new Set());
    });
  }

  const count = live.size;

  return (
    <BulkContext.Provider value={ctx}>
      {count > 0 ? (
        <div className="sticky top-2 z-20 mb-3 flex flex-wrap items-center gap-2 rounded-2xl border border-navy-900/10 bg-navy-950 px-4 py-3 text-sm text-white shadow-lg">
          <span className="mr-2 font-semibold">
            {count} {count === 1 ? noun[0] : noun[1]} selected
          </span>
          {[...new Set(actions.filter((a) => a.group).map((a) => a.group!))].map((group) => (
            <select
              key={group}
              disabled={pending}
              value=""
              aria-label={group}
              onChange={(e) => {
                const action = actions.find((a) => a.group === group && a.value === e.target.value);
                if (action) execute(action);
              }}
              className="rounded-lg border-0 bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white focus:ring-2 focus:ring-gold-400 disabled:opacity-60 [&>option]:text-navy-900"
            >
              <option value="">{group}</option>
              {actions
                .filter((a) => a.group === group)
                .map((a) => (
                  <option key={a.value} value={a.value}>
                    {a.label}
                  </option>
                ))}
            </select>
          ))}
          {actions.filter((a) => !a.group).map((action) => (
            <button
              key={action.value}
              type="button"
              disabled={pending}
              onClick={() => execute(action)}
              className={cn(
                "rounded-lg px-3 py-1.5 text-xs font-semibold transition-colors disabled:opacity-60",
                action.danger
                  ? confirming?.value === action.value
                    ? "bg-red-600 hover:bg-red-700"
                    : "bg-white/10 text-red-200 hover:bg-red-600 hover:text-white"
                  : "bg-white/10 hover:bg-white/20",
              )}
            >
              {confirming?.value === action.value ? `Confirm: ${action.label.toLowerCase()} ${count}` : action.label}
            </button>
          ))}
          {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
          <button
            type="button"
            onClick={() => {
              setSelected(new Set());
              setConfirming(null);
            }}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs text-navy-200 hover:text-white"
          >
            <X className="size-3.5" aria-hidden /> Clear
          </button>
        </div>
      ) : null}

      {notice.error || notice.message ? (
        <p
          role={notice.error ? "alert" : "status"}
          className={cn(
            "mb-3 rounded-lg px-4 py-2.5 text-sm",
            notice.error ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-800",
          )}
        >
          {notice.error ?? notice.message}
        </p>
      ) : null}

      {children}
    </BulkContext.Provider>
  );
}

const boxClass = "size-4 cursor-pointer rounded border-navy-900/30 accent-navy-900";

export function BulkSelectAll() {
  const { all, selected, setAll } = useBulk();
  const checked = all.length > 0 && selected.size === all.length;
  return (
    <input
      type="checkbox"
      aria-label="Select all"
      className={boxClass}
      checked={checked}
      ref={(el) => {
        if (el) el.indeterminate = selected.size > 0 && !checked;
      }}
      onChange={(e) => setAll(e.target.checked)}
    />
  );
}

export function BulkCheckbox({ id, label }: { id: string; label: string }) {
  const { selected, toggle } = useBulk();
  return (
    <input
      type="checkbox"
      aria-label={`Select ${label}`}
      className={boxClass}
      checked={selected.has(id)}
      onChange={() => toggle(id)}
    />
  );
}
