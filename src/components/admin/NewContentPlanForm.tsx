"use client";

import { useActionState, useState } from "react";
import { CalendarPlus } from "lucide-react";
import { createContentPlan, type ActionState } from "@/app/admin/actions/campaigns";
import { Alert, Card, SubmitButton, inputClass } from "@/components/admin/ui";

export function NewContentPlanForm({
  clients,
  projects,
}: {
  clients: { id: string; name: string }[];
  projects: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(createContentPlan, {});
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
      >
        <CalendarPlus className="size-4" aria-hidden /> New monthly plan
      </button>
    );
  }

  return (
    <Card title="New content plan">
      <form action={action} className="space-y-4">
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}

        <div className="grid gap-3 sm:grid-cols-12">
          <select name="clientId" required defaultValue="" className={`${inputClass} sm:col-span-4`} aria-label="Client">
            <option value="">Select a client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input name="month" type="month" required className={`${inputClass} sm:col-span-3`} aria-label="Month" />
          <input
            name="contractedCount"
            type="number"
            min={0}
            placeholder="Contracted posts"
            className={`${inputClass} sm:col-span-2`}
          />
          <select name="projectId" defaultValue="" className={`${inputClass} sm:col-span-3`} aria-label="Project">
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex gap-3">
          <SubmitButton>Create plan</SubmitButton>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-medium text-navy-800 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
