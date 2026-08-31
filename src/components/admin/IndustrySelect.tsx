"use client";

import { useRef, useState } from "react";
import { Undo2 } from "lucide-react";
import { inputClass } from "@/components/admin/ui";

/** Sentinel option value; not a real industry, so it can never collide with one. */
const ADD_NEW = "__add_new__";

/**
 * Industry picker with an "add another" escape hatch as the last option.
 *
 * The submitted value is always plain text under `name`, whichever way it was
 * chosen, so the server action needs no special case. A value already on the
 * record that is not in the list (typed before this dropdown existed) opens in
 * the free-text state rather than being silently dropped.
 */
export function IndustrySelect({
  name = "industry",
  id = "industry",
  options,
  defaultValue = "",
}: {
  name?: string;
  id?: string;
  options: string[];
  defaultValue?: string;
}) {
  const known = !defaultValue || options.some((o) => o === defaultValue);
  const [custom, setCustom] = useState(!known);
  const [value, setValue] = useState(defaultValue);
  const inputRef = useRef<HTMLInputElement>(null);

  if (custom) {
    return (
      <div className="flex gap-2">
        <input
          ref={inputRef}
          id={id}
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Type the industry"
          autoComplete="off"
          className={inputClass}
        />
        <button
          type="button"
          onClick={() => {
            setValue("");
            setCustom(false);
          }}
          className="shrink-0 rounded-xl border border-navy-900/15 px-3 text-navy-800 transition-colors hover:border-gold-500 hover:bg-gold-50"
          title="Back to the list"
          aria-label="Back to the list"
        >
          <Undo2 className="size-4" aria-hidden />
        </button>
      </div>
    );
  }

  return (
    <select
      id={id}
      name={name}
      value={value}
      className={inputClass}
      onChange={(e) => {
        if (e.target.value === ADD_NEW) {
          setValue("");
          setCustom(true);
          // Focus lands on the new field once React has swapped it in.
          requestAnimationFrame(() => inputRef.current?.focus());
          return;
        }
        setValue(e.target.value);
      }}
    >
      <option value="">— Select an industry —</option>
      {options.map((option) => (
        <option key={option} value={option}>
          {option}
        </option>
      ))}
      <option value={ADD_NEW}>＋ Add another industry…</option>
    </select>
  );
}
