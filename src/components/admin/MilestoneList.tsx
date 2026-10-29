"use client";

import { useState } from "react";
import { Check, Pencil, Trash2, X } from "lucide-react";
import { Badge, inputClass } from "@/components/admin/ui";
import { PendingButton } from "@/components/admin/PendingButton";
import { formatDate } from "@/lib/utils";

const MILESTONE_STATUSES = ["PENDING", "IN_PROGRESS", "CLIENT_REVIEW", "COMPLETED", "BLOCKED"];
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");
const day = (iso: string | null) => (iso ? iso.slice(0, 10) : "");

export type MilestoneItem = {
  id: string;
  title: string;
  description: string | null;
  status: string;
  startDate: string | null;
  dueDate: string | null;
  ownerId: string | null;
  owner: string | null;
};

/** Milestones with an inline editor per row; one row edits at a time. */
export function MilestoneList({
  milestones,
  owners,
  editable,
  save,
  remove,
}: {
  milestones: MilestoneItem[];
  owners: { id: string; name: string }[];
  editable: boolean;
  save: (form: FormData) => Promise<void>;
  remove: (id: string) => Promise<void>;
}) {
  const [editing, setEditing] = useState<string | null>(null);

  if (!milestones.length) return <p className="mb-5 text-sm text-slate-500">No milestones yet.</p>;

  return (
    <ol className="mb-5 space-y-2">
      {milestones.map((m) =>
        editing === m.id ? (
          <li key={m.id} className="rounded-xl border border-gold-400/60 bg-gold-50/40 p-4">
            <form
              action={async (form) => {
                await save(form);
                setEditing(null);
              }}
              className="grid gap-3 sm:grid-cols-12"
            >
              <input type="hidden" name="milestoneId" value={m.id} />
              <input name="title" required defaultValue={m.title} aria-label="Title" className={`${inputClass} sm:col-span-6`} />
              <select name="status" defaultValue={m.status} aria-label="Status" className={`${inputClass} sm:col-span-3`}>
                {MILESTONE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {pretty(s)}
                  </option>
                ))}
              </select>
              <select name="ownerId" defaultValue={m.ownerId ?? ""} aria-label="Owner" className={`${inputClass} sm:col-span-3`}>
                <option value="">No owner</option>
                {owners.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <textarea
                name="description"
                rows={2}
                defaultValue={m.description ?? ""}
                placeholder="Details (optional)"
                aria-label="Description"
                className={`${inputClass} sm:col-span-6`}
              />
              <label className="text-xs text-slate-500 sm:col-span-3">
                Start
                <input name="startDate" type="date" defaultValue={day(m.startDate)} className={`${inputClass} mt-1`} />
              </label>
              <label className="text-xs text-slate-500 sm:col-span-3">
                Due
                <input name="dueDate" type="date" defaultValue={day(m.dueDate)} className={`${inputClass} mt-1`} />
              </label>
              <div className="flex justify-end gap-2 sm:col-span-12">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-navy-900/15 px-4 py-2 text-sm font-medium text-navy-700 hover:bg-white"
                >
                  <X className="size-4" aria-hidden /> Cancel
                </button>
                <PendingButton
                  icon={<Check className="size-4" aria-hidden />}
                  pendingLabel="Saving…"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
                >
                  Save milestone
                </PendingButton>
              </div>
            </form>
          </li>
        ) : (
          <li key={m.id} className="flex flex-wrap items-center gap-3 rounded-xl border border-navy-900/10 bg-slate-50 px-4 py-3">
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-medium text-navy-900">{m.title}</span>
              {m.description ? <span className="block text-xs text-slate-500">{m.description}</span> : null}
            </span>
            <Badge tone={m.status === "COMPLETED" ? "success" : m.status === "BLOCKED" ? "warn" : "neutral"}>{pretty(m.status)}</Badge>
            {m.dueDate ? <span className="text-xs text-slate-500">{formatDate(m.dueDate)}</span> : null}
            {m.owner ? <span className="text-xs text-slate-500">{m.owner}</span> : null}
            {editable ? (
              <span className="inline-flex gap-1">
                <button
                  type="button"
                  onClick={() => setEditing(m.id)}
                  className="rounded-lg p-1.5 text-slate-400 hover:bg-navy-50 hover:text-navy-900"
                  aria-label={`Edit ${m.title}`}
                >
                  <Pencil className="size-3.5" />
                </button>
                <form action={() => remove(m.id)}>
                  <PendingButton className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" aria-label={`Delete ${m.title}`}>
                    <Trash2 className="size-3.5" />
                  </PendingButton>
                </form>
              </span>
            ) : null}
          </li>
        ),
      )}
    </ol>
  );
}
