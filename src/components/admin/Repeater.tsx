"use client";

import { useState } from "react";
import { GripVertical, Plus, Trash2 } from "lucide-react";
import { inputClass } from "@/components/admin/ui";

type Shape = { key: string; label: string; type?: "text" | "textarea" }[];

/**
 * Edits a JSON array column (service features, process steps, case-study
 * results…). The value is serialised into one hidden input on submit.
 */
export function Repeater({
  name,
  shape,
  defaultValue = [],
  addLabel = "Add row",
  emptyLabel = "Nothing added yet.",
}: {
  name: string;
  shape: Shape;
  defaultValue?: Record<string, string>[];
  addLabel?: string;
  emptyLabel?: string;
}) {
  const [rows, setRows] = useState<Record<string, string>[]>(
    Array.isArray(defaultValue) ? defaultValue : [],
  );

  const blank = () => Object.fromEntries(shape.map((f) => [f.key, ""]));

  const update = (index: number, key: string, value: string) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, [key]: value } : row)));

  const move = (index: number, delta: number) =>
    setRows((prev) => {
      const next = [...prev];
      const target = index + delta;
      if (target < 0 || target >= next.length) return prev;
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(rows.filter((r) => Object.values(r).some(Boolean)))} />

      {rows.length === 0 ? <p className="text-sm text-slate-500">{emptyLabel}</p> : null}

      {rows.map((row, index) => (
        <div key={index} className="rounded-xl border border-navy-900/10 bg-slate-50 p-4">
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-1 text-xs font-medium text-slate-500">
              <GripVertical className="size-3.5" aria-hidden />
              Row {index + 1}
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => move(index, -1)}
                disabled={index === 0}
                className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-white disabled:opacity-30"
              >
                ↑
              </button>
              <button
                type="button"
                onClick={() => move(index, 1)}
                disabled={index === rows.length - 1}
                className="rounded px-2 py-1 text-xs text-slate-500 hover:bg-white disabled:opacity-30"
              >
                ↓
              </button>
              <button
                type="button"
                onClick={() => setRows((prev) => prev.filter((_, i) => i !== index))}
                className="rounded p-1.5 text-red-600 hover:bg-red-50"
                aria-label={`Remove row ${index + 1}`}
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          </div>

          <div className="grid gap-3">
            {shape.map((field) => (
              <div key={field.key}>
                <label className="text-xs font-medium text-slate-600">{field.label}</label>
                {field.type === "textarea" ? (
                  <textarea
                    rows={2}
                    value={row[field.key] ?? ""}
                    onChange={(e) => update(index, field.key, e.target.value)}
                    className={`${inputClass} mt-1`}
                  />
                ) : (
                  <input
                    value={row[field.key] ?? ""}
                    onChange={(e) => update(index, field.key, e.target.value)}
                    className={`${inputClass} mt-1`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <button
        type="button"
        onClick={() => setRows((prev) => [...prev, blank()])}
        className="inline-flex items-center gap-2 rounded-lg border border-dashed border-navy-900/25 px-4 py-2.5 text-sm font-medium text-navy-800 transition-colors hover:border-gold-500 hover:bg-gold-50"
      >
        <Plus className="size-4" aria-hidden />
        {addLabel}
      </button>
    </div>
  );
}
