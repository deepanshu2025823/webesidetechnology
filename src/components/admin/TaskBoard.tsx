"use client";

import { useOptimistic, useState, useTransition } from "react";
import Link from "next/link";
import { CalendarClock, Flag, Trash2, User } from "lucide-react";
import { deleteTask, setTaskStatus } from "@/app/admin/actions/crm";
import { Badge } from "@/components/admin/ui";
import { cn, formatDate } from "@/lib/utils";

export type BoardTask = {
  id: string;
  title: string;
  status: string;
  priority: string;
  dueDate: string | null;
  assignee: string | null;
  projectId: string;
  projectName?: string;
  milestone?: string | null;
};

const COLUMNS = [
  { key: "TODO", label: "To do" },
  { key: "ASSIGNED", label: "Assigned" },
  { key: "IN_PROGRESS", label: "In progress" },
  { key: "REVIEW", label: "Review" },
  { key: "CLIENT_APPROVAL", label: "Client approval" },
  { key: "REVISION", label: "Revision" },
  { key: "DONE", label: "Done" },
];

const PRIORITY_TONE: Record<string, "muted" | "neutral" | "warn"> = {
  LOW: "muted",
  MEDIUM: "neutral",
  HIGH: "warn",
  CRITICAL: "warn",
};

/**
 * Status board. Cards move through a select rather than drag-and-drop so it
 * works with a keyboard and on a phone, which is where most status updates
 * actually happen.
 */
export function TaskBoard({
  tasks,
  editable,
  showProject = false,
}: {
  tasks: BoardTask[];
  editable: boolean;
  showProject?: boolean;
}) {
  const [optimistic, moveOptimistic] = useOptimistic(
    tasks,
    (state: BoardTask[], change: { id: string; status: string }) =>
      state.map((t) => (t.id === change.id ? { ...t, status: change.status } : t)),
  );
  const [, startTransition] = useTransition();
  const [confirming, setConfirming] = useState<string | null>(null);

  const move = (id: string, status: string) =>
    startTransition(async () => {
      moveOptimistic({ id, status });
      await setTaskStatus(id, status);
    });

  const today = new Date();
  today.setHours(23, 59, 59, 999);

  return (
    <div className="scroll-slim -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
      {COLUMNS.map((column) => {
        const cards = optimistic.filter((t) => t.status === column.key);
        return (
          <section key={column.key} className="w-72 shrink-0">
            <header className="mb-3 flex items-center justify-between px-1">
              <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{column.label}</h3>
              <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{cards.length}</span>
            </header>

            <ul className="space-y-2">
              {cards.map((task) => {
                const overdue = task.dueDate && new Date(task.dueDate) <= today && task.status !== "DONE";
                return (
                  <li key={task.id} className="rounded-xl border border-navy-900/10 bg-white p-3 shadow-sm">
                    <p className="text-sm font-medium leading-snug text-navy-900">{task.title}</p>

                    {showProject && task.projectName ? (
                      <Link
                        href={`/admin/client-projects/${task.projectId}`}
                        className="mt-1 block truncate text-xs text-gold-700 hover:underline"
                      >
                        {task.projectName}
                      </Link>
                    ) : null}
                    {task.milestone ? <p className="mt-0.5 text-xs text-slate-400">{task.milestone}</p> : null}

                    <div className="mt-2.5 flex flex-wrap items-center gap-2 text-xs text-slate-500">
                      <Badge tone={PRIORITY_TONE[task.priority] ?? "neutral"}>
                        <Flag className="mr-1 inline size-3" aria-hidden />
                        {task.priority.toLowerCase()}
                      </Badge>
                      {task.assignee ? (
                        <span className="inline-flex items-center gap-1">
                          <User className="size-3" aria-hidden />
                          {task.assignee}
                        </span>
                      ) : null}
                      {task.dueDate ? (
                        <span className={cn("inline-flex items-center gap-1", overdue && "font-medium text-red-600")}>
                          <CalendarClock className="size-3" aria-hidden />
                          {formatDate(task.dueDate)}
                        </span>
                      ) : null}
                    </div>

                    {editable ? (
                      <div className="mt-3 flex items-center gap-2">
                        <select
                          value={task.status}
                          onChange={(e) => move(task.id, e.target.value)}
                          aria-label={`Move ${task.title}`}
                          className="min-w-0 flex-1 rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs focus:border-gold-500 focus:outline-none"
                        >
                          {COLUMNS.map((c) => (
                            <option key={c.key} value={c.key}>
                              {c.label}
                            </option>
                          ))}
                        </select>

                        {confirming === task.id ? (
                          <button
                            type="button"
                            onClick={() => startTransition(() => void deleteTask(task.id))}
                            className="rounded-lg bg-red-600 px-2 py-1.5 text-xs font-medium text-white"
                          >
                            Sure?
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={() => setConfirming(task.id)}
                            className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            aria-label={`Delete ${task.title}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        )}
                      </div>
                    ) : null}
                  </li>
                );
              })}

              {cards.length === 0 ? (
                <li className="rounded-xl border border-dashed border-navy-900/15 px-3 py-6 text-center text-xs text-slate-400">
                  Nothing here
                </li>
              ) : null}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
