"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { inputClass } from "@/components/admin/ui";

/** Simple string[] editor serialised to a hidden JSON input. */
export function TagListInput({
  name,
  defaultValue = [],
  placeholder = "Add an item and press Enter",
}: {
  name: string;
  defaultValue?: string[];
  placeholder?: string;
}) {
  const [items, setItems] = useState<string[]>(Array.isArray(defaultValue) ? defaultValue : []);
  const [draft, setDraft] = useState("");

  function add() {
    const value = draft.trim();
    if (!value || items.includes(value)) return;
    setItems((prev) => [...prev, value]);
    setDraft("");
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={JSON.stringify(items)} />

      <div className="flex gap-2">
        <input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              add();
            }
          }}
          placeholder={placeholder}
          className={inputClass}
        />
        <button
          type="button"
          onClick={add}
          className="shrink-0 rounded-xl border border-navy-900/15 px-3 text-navy-800 transition-colors hover:border-gold-500 hover:bg-gold-50"
          aria-label="Add"
        >
          <Plus className="size-4" />
        </button>
      </div>

      {items.length ? (
        <ul className="flex flex-wrap gap-2">
          {items.map((item, i) => (
            <li
              key={`${item}-${i}`}
              className="inline-flex items-center gap-1.5 rounded-full bg-navy-50 py-1 pl-3 pr-1.5 text-xs font-medium text-navy-800"
            >
              {item}
              <button
                type="button"
                onClick={() => setItems((prev) => prev.filter((_, idx) => idx !== i))}
                className="grid size-5 place-items-center rounded-full text-navy-500 hover:bg-white hover:text-red-600"
                aria-label={`Remove ${item}`}
              >
                <X className="size-3" />
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
