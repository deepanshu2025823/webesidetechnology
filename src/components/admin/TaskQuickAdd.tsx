"use client";

import { useActionState, useEffect, useRef } from "react";
import { Plus } from "lucide-react";
import { saveTask, type ActionState } from "@/app/admin/actions/crm";
import { Alert, SubmitButton, inputClass } from "@/components/admin/ui";

const STATUSES = [
  ["TODO", "To do"],
  ["ASSIGNED", "Assigned"],
  ["IN_PROGRESS", "In progress"],
  ["REVIEW", "Review"],
  ["CLIENT_APPROVAL", "Client approval"],
  ["REVISION", "Revision"],
  ["DONE", "Done"],
];

const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];

export function TaskQuickAdd({
  projectId,
  milestones,
  assignees,
}: {
  projectId: string;
  milestones: { id: string; title: string }[];
  assignees: { id: string; name: string }[];
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveTask, {});
  const formRef = useRef<HTMLFormElement>(null);

  useEffect(() => {
    if (state.ok) formRef.current?.reset();
  }, [state]);

  return (
    <form ref={formRef} action={action} className="space-y-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4">
      <input type="hidden" name="projectId" value={projectId} />
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}

      <input name="title" required placeholder="What needs doing?" className={inputClass} />

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <select name="assigneeId" defaultValue="" className={inputClass} aria-label="Assignee">
          <option value="">Unassigned</option>
          {assignees.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>

        <select name="milestoneId" defaultValue="" className={inputClass} aria-label="Milestone">
          <option value="">No milestone</option>
          {milestones.map((m) => (
            <option key={m.id} value={m.id}>
              {m.title}
            </option>
          ))}
        </select>

        <select name="priority" defaultValue="MEDIUM" className={inputClass} aria-label="Priority">
          {PRIORITIES.map((p) => (
            <option key={p} value={p}>
              {p.charAt(0) + p.slice(1).toLowerCase()}
            </option>
          ))}
        </select>

        <input name="dueDate" type="date" className={inputClass} aria-label="Due date" />
      </div>

      <div className="flex items-center gap-3">
        <select name="status" defaultValue="TODO" className={`${inputClass} max-w-40`} aria-label="Status">
          {STATUSES.map(([v, l]) => (
            <option key={v} value={v}>
              {l}
            </option>
          ))}
        </select>
        <SubmitButton className="ml-auto" icon={<Plus className="size-4" aria-hidden />}>
          Add task
        </SubmitButton>
      </div>
    </form>
  );
}
