import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit, isOwnScoped } from "@/lib/permissions";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { DataTools } from "@/components/admin/DataTools";
import { cn, formatDate, formatMoney } from "@/lib/utils";

const HEALTH_TONE = { ON_TRACK: "success", AT_RISK: "warn", DELAYED: "muted" } as const;
const STAGES = ["ALL", "PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"];

export default async function ClientProjectsPage({
  searchParams,
}: {
  searchParams: Promise<{ stage?: string; q?: string; from?: string; to?: string }>;
}) {
  const session = await requireModule("projects");
  const { stage, q, from, to } = await searchParams;

  const term = q?.trim();
  const end = to ? new Date(to) : undefined;
  if (end) end.setHours(23, 59, 59, 999);

  // Team members only see projects they are actually on.
  const ownOnly = isOwnScoped(session.role, "projects");

  const projects = await prisma.clientProject.findMany({
    where: {
      ...(stage && stage !== "ALL" ? { stage: stage as never } : {}),
      ...(term
        ? {
            OR: [
              { name: { contains: term } },
              { code: { contains: term } },
              { client: { name: { contains: term } } },
            ],
          }
        : {}),
      ...(from || end
        ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(end ? { lte: end } : {}) } }
        : {}),
      ...(ownOnly
        ? {
            OR: [
              { managerId: session.id },
              { members: { some: { userId: session.id } } },
              { tasks: { some: { assigneeId: session.id } } },
            ],
          }
        : {}),
    },
    orderBy: [{ stage: "asc" }, { endDate: "asc" }],
    include: {
      client: { select: { id: true, name: true } },
      manager: { select: { name: true } },
      _count: { select: { tasks: true, milestones: true } },
    },
  });

  const editable = canEdit(session.role, "projects");

  /** Stage links keep whatever search and dates are already applied. */
  const stageHref = (next: string) => {
    const params = new URLSearchParams();
    if (next !== "ALL") params.set("stage", next);
    for (const [key, value] of Object.entries({ q, from, to })) if (value) params.set(key, value);
    return params.size ? `/admin/client-projects?${params}` : "/admin/client-projects";
  };

  return (
    <>
      <PageHeader
        title="Projects"
        description={
          ownOnly
            ? "The projects you are assigned to."
            : "Client delivery — scope, milestones, tasks and health for every engagement."
        }
        actions={
          editable ? (
            <Link
              href="/admin/client-projects/new"
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              <Plus className="size-4" aria-hidden /> New project
            </Link>
          ) : null
        }
      />

      {/* Stage chips below already filter by stage. */}
      <DataTools dataset="client-projects" statuses={false} />

      <nav className="mb-5 flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <Link
            key={s}
            href={stageHref(s)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              (stage ?? "ALL") === s
                ? "bg-navy-900 text-white"
                : "border border-navy-900/15 text-navy-700 hover:border-gold-500 hover:bg-gold-50",
            )}
          >
            {s.charAt(0) + s.slice(1).toLowerCase().replace("_", " ")}
          </Link>
        ))}
      </nav>

      {projects.length === 0 ? (
        <EmptyState
          title="No projects here"
          description="Create one directly, or convert an accepted quotation."
          action={
            editable ? (
              <Link href="/admin/client-projects/new" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white">
                Create a project
              </Link>
            ) : null
          }
        />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2">
          {projects.map((p) => {
            const overdue = p.endDate && p.endDate < new Date() && p.stage !== "COMPLETED" && p.stage !== "CANCELLED";
            return (
              <li key={p.id}>
                <Link
                  href={`/admin/client-projects/${p.id}`}
                  className="flex h-full flex-col rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold-400/60 hover:shadow-brand"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-navy-900">{p.name}</p>
                      <p className="text-xs text-slate-500">
                        {p.code} · {p.client.name}
                      </p>
                    </div>
                    <Badge tone={HEALTH_TONE[p.health]}>{p.health.toLowerCase().replace("_", " ")}</Badge>
                  </div>

                  <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
                    <span className="capitalize">{p.stage.toLowerCase().replace("_", " ")}</span>
                    <span>
                      {p._count.milestones} milestone{p._count.milestones === 1 ? "" : "s"}
                    </span>
                    <span>
                      {p._count.tasks} task{p._count.tasks === 1 ? "" : "s"}
                    </span>
                    {p.budget ? <span>{formatMoney(p.budget)}</span> : null}
                  </div>

                  <div className="mt-3 flex items-center justify-between border-t border-navy-900/5 pt-3 text-xs">
                    <span className="text-slate-500">{p.manager?.name ?? "Unassigned"}</span>
                    {p.endDate ? (
                      <span className={cn(overdue ? "font-medium text-red-600" : "text-slate-500")}>
                        due {formatDate(p.endDate)}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
