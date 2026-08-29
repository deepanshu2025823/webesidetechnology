"use client";

import { useTransition } from "react";
import { setEventTaskStatus } from "@/app/admin/actions/events";
import { Badge } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

const STATUSES = ["PLANNED", "IN_PROGRESS", "BLOCKED", "DONE"];
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export function EventTaskRow({
  task,
  editable,
}: {
  task: { id: string; title: string; category: string; status: string; assignee: string | null; dueDate: string | null };
  editable: boolean;
}) {
  const [, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-sm text-navy-900">{task.title}</span>
        <span className="block text-xs text-slate-500">
          {task.category}
          {task.assignee ? ` · ${task.assignee}` : ""}
          {task.dueDate ? ` · ${formatDate(task.dueDate)}` : ""}
        </span>
      </span>

      {editable ? (
        <select
          value={task.status}
          onChange={(e) => startTransition(() => void setEventTaskStatus(task.id, e.target.value))}
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
