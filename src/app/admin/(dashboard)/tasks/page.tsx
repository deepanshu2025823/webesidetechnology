import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit, isOwnScoped } from "@/lib/permissions";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { TaskBoard } from "@/components/admin/TaskBoard";
import { DataTools } from "@/components/admin/DataTools";
import { cn } from "@/lib/utils";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ scope?: string; project?: string; q?: string; status?: string; from?: string; to?: string }>;
}) {
  const session = await requireModule("tasks");
  const { scope, project, q, status, from, to } = await searchParams;

  const term = q?.trim();
  const end = to ? new Date(to) : undefined;
  if (end) end.setHours(23, 59, 59, 999);

  // Team members are always limited to their own work, whatever the filter says.
  const forced = isOwnScoped(session.role, "tasks");
  const mine = forced || scope !== "all";

  const [tasks, projects] = await Promise.all([
    prisma.task.findMany({
      where: {
        ...(mine ? { assigneeId: session.id } : {}),
        ...(project ? { projectId: project } : {}),
        ...(status && status !== "ALL" ? { status: status as never } : {}),
        ...(term
          ? {
              OR: [
                { title: { contains: term } },
                { description: { contains: term } },
                { project: { name: { contains: term } } },
              ],
            }
          : {}),
        ...(from || end
          ? { dueDate: { ...(from ? { gte: new Date(from) } : {}), ...(end ? { lte: end } : {}) } }
          : {}),
      },
      orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
      take: 300,
      include: {
        assignee: { select: { name: true } },
        milestone: { select: { title: true } },
        project: { select: { id: true, name: true } },
      },
    }),
    prisma.clientProject.findMany({
      where: { stage: { in: ["PLANNED", "ACTIVE"] } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const open = tasks.filter((t) => t.status !== "DONE").length;
  const overdue = tasks.filter(
    (t) => t.status !== "DONE" && t.dueDate && t.dueDate < new Date(),
  ).length;

  return (
    <>
      <PageHeader
        title="Tasks"
        description={
          overdue
            ? `${open} open, ${overdue} overdue.`
            : `${open} open task${open === 1 ? "" : "s"}.`
        }
      />

      <DataTools dataset="tasks" />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {!forced ? (
          <>
            <Link
              href="/admin/tasks"
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium",
                mine ? "bg-navy-900 text-white" : "border border-navy-900/15 text-navy-700 hover:bg-gold-50",
              )}
            >
              My tasks
            </Link>
            <Link
              href="/admin/tasks?scope=all"
              className={cn(
                "rounded-full px-3.5 py-1.5 text-xs font-medium",
                !mine ? "bg-navy-900 text-white" : "border border-navy-900/15 text-navy-700 hover:bg-gold-50",
              )}
            >
              Everyone
            </Link>
          </>
        ) : null}

        {projects.length ? (
          <form action="/admin/tasks" className="ml-auto flex items-center gap-2">
            {!mine ? <input type="hidden" name="scope" value="all" /> : null}
            <select
              name="project"
              defaultValue={project ?? ""}
              aria-label="Filter by project"
              className="rounded-full border border-navy-900/15 px-4 py-1.5 text-sm focus:border-gold-500 focus:outline-none"
            >
              <option value="">All projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
            <button type="submit" className="rounded-full bg-navy-900 px-4 py-1.5 text-xs font-semibold text-white">
              Filter
            </button>
          </form>
        ) : null}
      </div>

      {tasks.length === 0 ? (
        <EmptyState
          title={mine ? "Nothing assigned to you" : "No tasks yet"}
          description="Tasks are created inside a project, against a milestone."
        />
      ) : (
        <TaskBoard
          editable={canEdit(session.role, "tasks") || forced}
          showProject
          tasks={tasks.map((t) => ({
            id: t.id,
            title: t.title,
            status: t.status,
            priority: t.priority,
            dueDate: t.dueDate ? t.dueDate.toISOString() : null,
            assignee: t.assignee?.name ?? null,
            projectId: t.project.id,
            projectName: t.project.name,
            milestone: t.milestone?.title ?? null,
          }))}
        />
      )}
    </>
  );
}
