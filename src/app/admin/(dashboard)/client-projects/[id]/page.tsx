import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, GitPullRequest, Pencil, Plus, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import {
  decideChangeRequest,
  deleteMilestone,
  saveChangeRequest,
  saveMilestone,
} from "@/app/admin/actions/crm";
import { Badge, Card, PageHeader, inputClass } from "@/components/admin/ui";
import { TaskBoard } from "@/components/admin/TaskBoard";
import { TaskQuickAdd } from "@/components/admin/TaskQuickAdd";
import { cn, formatDate, formatMoney } from "@/lib/utils";

const HEALTH_TONE = { ON_TRACK: "success", AT_RISK: "warn", DELAYED: "muted" } as const;
const MILESTONE_STATUSES = ["PENDING", "IN_PROGRESS", "CLIENT_REVIEW", "COMPLETED", "BLOCKED"];
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export default async function ClientProjectDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModule("projects");
  const { id } = await params;

  const project = await prisma.clientProject.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      manager: { select: { name: true } },
      service: { select: { title: true } },
      quotation: { select: { id: true, number: true } },
      milestones: { orderBy: { order: "asc" }, include: { owner: { select: { name: true } } } },
      tasks: {
        orderBy: [{ order: "asc" }, { createdAt: "asc" }],
        include: { assignee: { select: { name: true } }, milestone: { select: { title: true } } },
      },
      changeRequests: {
        orderBy: { createdAt: "desc" },
        include: { requestedBy: { select: { name: true } }, decidedBy: { select: { name: true } } },
      },
    },
  });
  if (!project) notFound();

  const editable = canEdit(session.role, "projects");
  const canEditTasks = canEdit(session.role, "tasks");
  const assignees = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  const done = project.tasks.filter((t) => t.status === "DONE").length;
  const progress = project.tasks.length ? Math.round((done / project.tasks.length) * 100) : 0;

  const addMilestone = saveMilestone.bind(null, project.id);
  const addChangeRequest = saveChangeRequest.bind(null, project.id);

  const scope = [
    ["Objectives", project.objectives],
    ["Inclusions", project.inclusions],
    ["Exclusions", project.exclusions],
    ["Assumptions", project.assumptions],
    ["Acceptance criteria", project.acceptanceCriteria],
  ].filter(([, v]) => v) as [string, string][];

  return (
    <>
      <Link
        href="/admin/client-projects"
        className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900"
      >
        <ArrowLeft className="size-4" aria-hidden /> All projects
      </Link>

      <PageHeader
        title={project.name}
        description={`${project.code} · ${project.client.name}${project.service ? ` · ${project.service.title}` : ""}`}
        actions={
          editable ? (
            <Link
              href={`/admin/client-projects/${project.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
            >
              <Pencil className="size-4" aria-hidden /> Edit scope
            </Link>
          ) : null
        }
      />

      {/* Health strip */}
      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-2xl border border-navy-900/10 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Stage</p>
          <p className="mt-1 font-medium capitalize text-navy-900">{pretty(project.stage)}</p>
        </div>
        <div className="rounded-2xl border border-navy-900/10 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Health</p>
          <p className="mt-1">
            <Badge tone={HEALTH_TONE[project.health]}>{pretty(project.health)}</Badge>
          </p>
        </div>
        <div className="rounded-2xl border border-navy-900/10 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Progress</p>
          <div className="mt-2 h-2 rounded-full bg-slate-100">
            <div className="h-2 rounded-full bg-gold-500" style={{ width: `${progress}%` }} />
          </div>
          <p className="mt-1.5 text-xs text-slate-500">
            {done} of {project.tasks.length} tasks done
          </p>
        </div>
        <div className="rounded-2xl border border-navy-900/10 bg-white p-4">
          <p className="text-xs uppercase tracking-wide text-slate-500">Budget</p>
          <p className="mt-1 font-medium text-navy-900">{project.budget ? formatMoney(project.budget) : "—"}</p>
          {project.endDate ? (
            <p className="text-xs text-slate-500">due {formatDate(project.endDate)}</p>
          ) : null}
        </div>
      </div>

      <div className="space-y-6">
        <Card title="Milestones" description="Dated checkpoints the client can see progress against.">
          {project.milestones.length ? (
            <ol className="mb-5 space-y-2">
              {project.milestones.map((m) => (
                <li
                  key={m.id}
                  className="flex flex-wrap items-center gap-3 rounded-xl border border-navy-900/10 bg-slate-50 px-4 py-3"
                >
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm font-medium text-navy-900">{m.title}</span>
                    {m.description ? <span className="block text-xs text-slate-500">{m.description}</span> : null}
                  </span>
                  <Badge tone={m.status === "COMPLETED" ? "success" : m.status === "BLOCKED" ? "warn" : "neutral"}>
                    {pretty(m.status)}
                  </Badge>
                  {m.dueDate ? <span className="text-xs text-slate-500">{formatDate(m.dueDate)}</span> : null}
                  {m.owner ? <span className="text-xs text-slate-500">{m.owner.name}</span> : null}
                  {editable ? (
                    <form action={deleteMilestone.bind(null, project.id, m.id)}>
                      <button
                        type="submit"
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                        aria-label={`Delete ${m.title}`}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    </form>
                  ) : null}
                </li>
              ))}
            </ol>
          ) : (
            <p className="mb-5 text-sm text-slate-500">No milestones yet.</p>
          )}

          {editable ? (
            <form action={addMilestone} className="grid gap-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4 sm:grid-cols-12">
              <input name="title" required placeholder="Milestone title" className={`${inputClass} sm:col-span-5`} />
              <select name="status" defaultValue="PENDING" className={`${inputClass} sm:col-span-3`} aria-label="Milestone status">
                {MILESTONE_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {pretty(s)}
                  </option>
                ))}
              </select>
              <input name="dueDate" type="date" className={`${inputClass} sm:col-span-2`} aria-label="Due date" />
              <select name="ownerId" defaultValue="" className={`${inputClass} sm:col-span-2`} aria-label="Owner">
                <option value="">Owner</option>
                {assignees.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-12"
              >
                <Plus className="size-4" aria-hidden /> Add milestone
              </button>
            </form>
          ) : null}
        </Card>

        <Card title="Tasks">
          {canEditTasks ? (
            <div className="mb-5">
              <TaskQuickAdd
                projectId={project.id}
                milestones={project.milestones.map((m) => ({ id: m.id, title: m.title }))}
                assignees={assignees}
              />
            </div>
          ) : null}

          <TaskBoard
            editable={canEditTasks}
            tasks={project.tasks.map((t) => ({
              id: t.id,
              title: t.title,
              status: t.status,
              priority: t.priority,
              dueDate: t.dueDate ? t.dueDate.toISOString() : null,
              assignee: t.assignee?.name ?? null,
              projectId: project.id,
              milestone: t.milestone?.title ?? null,
            }))}
          />
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title={`Scope baseline (v${project.scopeVersion})`}>
            {scope.length ? (
              <dl className="space-y-4">
                {scope.map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs font-semibold uppercase tracking-wide text-slate-500">{label}</dt>
                    <dd className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{value}</dd>
                  </div>
                ))}
              </dl>
            ) : (
              <p className="text-sm text-slate-500">No scope written yet — add it from Edit scope.</p>
            )}

            <dl className="mt-5 space-y-2 border-t border-navy-900/10 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Manager</dt>
                <dd className="text-navy-900">{project.manager?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Client</dt>
                <dd>
                  <Link href={`/admin/clients/${project.client.id}`} className="text-gold-700 hover:underline">
                    <Building2 className="mr-1 inline size-3.5" aria-hidden />
                    {project.client.name}
                  </Link>
                </dd>
              </div>
              {project.quotation ? (
                <div className="flex justify-between">
                  <dt className="text-slate-500">From quotation</dt>
                  <dd>
                    <Link href={`/admin/quotations/${project.quotation.id}`} className="text-gold-700 hover:underline">
                      {project.quotation.number}
                    </Link>
                  </dd>
                </div>
              ) : null}
            </dl>
          </Card>

          <Card title="Change requests" description="Scope changes with their cost and timeline impact.">
            {project.changeRequests.length ? (
              <ul className="mb-5 space-y-3">
                {project.changeRequests.map((cr) => (
                  <li key={cr.id} className="rounded-xl border border-navy-900/10 p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <p className="text-sm font-medium text-navy-900">{cr.title}</p>
                      <Badge
                        tone={cr.status === "APPROVED" ? "success" : cr.status === "REJECTED" ? "muted" : "warn"}
                      >
                        {pretty(cr.status)}
                      </Badge>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{cr.description}</p>
                    <p className="mt-2 text-xs text-slate-500">
                      {cr.costImpact ? `${formatMoney(cr.costImpact)} · ` : ""}
                      {cr.timeImpactDays ? `${cr.timeImpactDays} days · ` : ""}
                      raised by {cr.requestedBy?.name ?? "team"} on {formatDate(cr.createdAt)}
                    </p>

                    {editable && cr.status === "REQUESTED" ? (
                      <div className="mt-3 flex gap-2">
                        {["APPROVED", "REJECTED"].map((decision) => (
                          <form key={decision} action={decideChangeRequest.bind(null, project.id, cr.id)}>
                            <input type="hidden" name="status" value={decision} />
                            <button
                              type="submit"
                              className={cn(
                                "rounded-lg px-3 py-1.5 text-xs font-semibold",
                                decision === "APPROVED"
                                  ? "bg-navy-900 text-white hover:bg-navy-800"
                                  : "border border-navy-900/15 text-navy-700 hover:bg-slate-50",
                              )}
                            >
                              {decision === "APPROVED" ? "Approve" : "Reject"}
                            </button>
                          </form>
                        ))}
                      </div>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mb-5 text-sm text-slate-500">No change requests raised.</p>
            )}

            {editable ? (
              <form action={addChangeRequest} className="space-y-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4">
                <input name="title" required placeholder="What is changing?" className={inputClass} />
                <textarea name="description" required rows={2} placeholder="Why, and what it affects" className={inputClass} />
                <div className="grid grid-cols-2 gap-3">
                  <input name="costImpact" type="number" placeholder="Cost impact ₹" className={inputClass} aria-label="Cost impact" />
                  <input name="timeImpactDays" type="number" placeholder="Extra days" className={inputClass} aria-label="Time impact in days" />
                </div>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
                >
                  <GitPullRequest className="size-4" aria-hidden /> Raise change request
                </button>
              </form>
            ) : null}
          </Card>
        </div>
      </div>
    </>
  );
}
