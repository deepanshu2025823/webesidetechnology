"use client";

import { useState, useTransition } from "react";
import { Check, Trash2, X } from "lucide-react";

/** Two-step delete used inside admin list tables. */
export function DeleteRowButton({ action, label }: { action: () => Promise<void>; label: string }) {
  const [confirming, setConfirming] = useState(false);
  const [pending, startTransition] = useTransition();

  if (confirming) {
    return (
      <span className="inline-flex items-center gap-1">
        <button
          type="button"
          disabled={pending}
          onClick={() => startTransition(() => void action())}
          className="rounded-lg bg-red-600 p-2 text-white hover:bg-red-700 disabled:opacity-60"
          aria-label={`Confirm delete ${label}`}
        >
          <Check className="size-4" />
        </button>
        <button
          type="button"
          onClick={() => setConfirming(false)}
          className="rounded-lg p-2 text-slate-500 hover:bg-slate-100"
          aria-label="Cancel"
        >
          <X className="size-4" />
        </button>
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setConfirming(true)}
      className="rounded-lg p-2 text-slate-500 transition-colors hover:bg-red-50 hover:text-red-600"
      aria-label={`Delete ${label}`}
    >
      <Trash2 className="size-4" />
    </button>
  );
}
