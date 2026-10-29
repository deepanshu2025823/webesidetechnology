"use client";

import { useActionState } from "react";
import { justifyDay, type JustifyState } from "@/app/admin/actions/activity";
import { PendingButton } from "@/components/admin/PendingButton";
import { inputClass } from "@/components/admin/ui";

export function JustifyForm({ date, defaultValue }: { date: string; defaultValue?: string | null }) {
  const [state, action] = useActionState<JustifyState, FormData>(justifyDay, {});
  return (
    <form action={action} className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-start">
      <input type="hidden" name="date" value={date} />
      <textarea
        name="justification"
        rows={2}
        required
        minLength={5}
        defaultValue={defaultValue ?? ""}
        placeholder="e.g. Client meeting outside office 2–5 pm; on leave; worked offline on designs"
        aria-label={`Reason for ${date}`}
        className={`${inputClass} flex-1 text-sm`}
      />
      <PendingButton
        pendingLabel="Sending…"
        className="inline-flex shrink-0 items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
      >
        {defaultValue ? "Update reason" : "Send reason"}
      </PendingButton>
      {state.error ? <p className="text-xs text-red-600 sm:basis-full">{state.error}</p> : null}
      {state.message ? <p className="text-xs text-emerald-700 sm:basis-full">{state.message}</p> : null}
    </form>
  );
}
