"use client";

import { useState, useTransition } from "react";
import { Check, Loader2 } from "lucide-react";
import { updateServiceRow } from "@/app/admin/actions/content";
import { formatMoney } from "@/lib/utils";

/**
 * Price and sort order, editable in the list row.
 *
 * Saves on submit rather than on every keystroke: a price is typed a digit at a
 * time, and saving each one would write "₹4", "₹45", "₹450" to the database and
 * revalidate the public pages three times on the way to the number the editor
 * meant.
 */
export function ServiceRowEdit({
  id,
  priceFrom,
  priceUnit,
  order,
}: {
  id: string;
  priceFrom: number | null;
  priceUnit: string;
  order: number;
}) {
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");

  return (
    <form
      action={(formData) =>
        startTransition(async () => {
          const result = await updateServiceRow(id, formData);
          setError(result.error ?? "");
          if (!result.error) {
            setSaved(true);
            // Long enough to read, short enough not to linger over the next edit.
            setTimeout(() => setSaved(false), 2000);
          }
        })
      }
      className="flex items-center gap-1.5"
    >
      <span className="text-xs text-slate-400">₹</span>
      <input
        name="priceFrom"
        type="number"
        min={0}
        defaultValue={priceFrom ?? ""}
        placeholder="—"
        aria-label="Starting price"
        className="w-24 rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs tabular-nums focus:border-gold-500 focus:outline-none"
      />
      <select
        name="priceUnit"
        defaultValue={priceUnit || "project"}
        aria-label="Price unit"
        className="rounded-lg border border-navy-900/15 px-1.5 py-1.5 text-xs focus:border-gold-500 focus:outline-none"
      >
        {["project", "month", "quarter", "year", "campaign"].map((unit) => (
          <option key={unit} value={unit}>
            /{unit}
          </option>
        ))}
      </select>
      <input
        name="order"
        type="number"
        defaultValue={order}
        aria-label="Sort order"
        title="Sort order — lower appears first"
        className="w-14 rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs tabular-nums focus:border-gold-500 focus:outline-none"
      />

      <button
        type="submit"
        disabled={pending}
        className="rounded-lg px-2 py-1.5 text-xs font-semibold text-navy-900 transition-colors hover:bg-navy-50 disabled:opacity-50"
      >
        {pending ? <Loader2 className="size-3.5 animate-spin" aria-hidden /> : saved ? <Check className="size-3.5 text-green-600" aria-hidden /> : "Save"}
      </button>

      {error ? <span className="text-xs text-red-600">{error}</span> : null}
      {/* The formatted figure, for scanning the column without reading inputs. */}
      {priceFrom ? <span className="sr-only">{formatMoney(priceFrom)}</span> : null}
    </form>
  );
}
