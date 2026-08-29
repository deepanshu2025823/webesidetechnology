import { prisma } from "@/lib/prisma";
import { requirePortalSession } from "@/lib/portal-auth";
import { formatDate } from "@/lib/utils";

const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export default async function PortalProjectsPage() {
  const session = await requirePortalSession();

  const projects = await prisma.clientProject.findMany({
    where: { clientId: session.clientId },
    orderBy: { startDate: "desc" },
    include: {
      milestones: { orderBy: { order: "asc" } },
      // Clients see deliverable-level progress, not internal task chatter.
      tasks: { select: { status: true } },
    },
  });

  return (
    <>
      <h1 className="text-2xl font-semibold text-navy-900">Projects</h1>
      <p className="mt-1 text-sm text-slate-500">Scope, milestones and where each piece of work stands.</p>

      {projects.length ? (
        <ul className="mt-6 space-y-4">
          {projects.map((project) => {
            const done = project.tasks.filter((t) => t.status === "DONE").length;
            const progress = project.tasks.length ? Math.round((done / project.tasks.length) * 100) : 0;

            return (
              <li key={project.id} className="rounded-2xl border border-navy-900/10 bg-white p-6 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-medium text-navy-900">{project.name}</h2>
                    <p className="text-xs text-slate-500">
                      {pretty(project.stage)} · {pretty(project.health)}
                      {project.endDate ? ` · target ${formatDate(project.endDate)}` : ""}
                    </p>
                  </div>
                  <span className="text-sm font-medium text-navy-900">{progress}% complete</span>
                </div>

                <div className="mt-3 h-2 rounded-full bg-slate-100">
                  <div className="h-2 rounded-full bg-gold-500" style={{ width: `${progress}%` }} />
                </div>

                {project.milestones.length ? (
                  <ol className="mt-5 space-y-2 border-t border-navy-900/5 pt-4">
                    {project.milestones.map((m) => (
                      <li key={m.id} className="flex flex-wrap items-center gap-3 text-sm">
                        <span
                          className={
                            m.status === "COMPLETED"
                              ? "size-2 rounded-full bg-emerald-500"
                              : m.status === "BLOCKED"
                                ? "size-2 rounded-full bg-red-500"
                                : "size-2 rounded-full bg-slate-300"
                          }
                          aria-hidden
                        />
                        <span className="min-w-0 flex-1 text-navy-900">{m.title}</span>
                        <span className="text-xs capitalize text-slate-500">{pretty(m.status)}</span>
                        {m.dueDate ? <span className="text-xs text-slate-400">{formatDate(m.dueDate)}</span> : null}
                      </li>
                    ))}
                  </ol>
                ) : null}

                {project.inclusions ? (
                  <details className="mt-4 border-t border-navy-900/5 pt-4">
                    <summary className="cursor-pointer text-sm font-medium text-navy-900">Agreed scope</summary>
                    <div className="mt-3 space-y-3 text-sm text-slate-600">
                      {project.objectives ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Objectives</p>
                          <p className="whitespace-pre-wrap">{project.objectives}</p>
                        </div>
                      ) : null}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Included</p>
                        <p className="whitespace-pre-wrap">{project.inclusions}</p>
                      </div>
                      {project.exclusions ? (
                        <div>
                          <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Not included</p>
                          <p className="whitespace-pre-wrap">{project.exclusions}</p>
                        </div>
                      ) : null}
                    </div>
                  </details>
                ) : null}
              </li>
            );
          })}
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-navy-900/20 bg-white px-6 py-10 text-center text-sm text-slate-500">
          No projects yet.
        </p>
      )}
    </>
  );
}
