"use client";

import { useTransition } from "react";
import { setSeoTaskStatus } from "@/app/admin/actions/campaigns";
import { Badge } from "@/components/admin/ui";

const STATUSES = ["PLANNED", "IN_PROGRESS", "BLOCKED", "DONE"];
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export function SeoTaskRow({
  task,
  editable,
}: {
  task: { id: string; title: string; category: string; status: string; assignee: string | null };
  editable: boolean;
}) {
  const [, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-navy-900">{task.title}</span>
        <span className="block text-xs text-slate-500">
          {pretty(task.category)}
          {task.assignee ? ` · ${task.assignee}` : ""}
        </span>
      </span>

      {editable ? (
        <select
          value={task.status}
          onChange={(e) => startTransition(() => void setSeoTaskStatus(task.id, e.target.value))}
          aria-label={`Status for ${task.title}`}
          className="rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs focus:border-gold-500 focus:outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {pretty(s)}
            </option>
          ))}
        </select>
      ) : (
        <Badge tone={task.status === "DONE" ? "success" : "neutral"}>{pretty(task.status)}</Badge>
      )}
    </li>
  );
}
