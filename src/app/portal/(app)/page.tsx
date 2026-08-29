import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requirePortalSession } from "@/lib/portal-auth";
import { formatDate, formatMoney } from "@/lib/utils";

export default async function PortalOverviewPage() {
  const session = await requirePortalSession();

  const [projects, approvals, invoices, tickets] = await Promise.all([
    prisma.clientProject.findMany({
      where: { clientId: session.clientId, stage: { notIn: ["CANCELLED"] } },
      include: { _count: { select: { tasks: true } }, tasks: { where: { status: "DONE" }, select: { id: true } } },
      orderBy: { updatedAt: "desc" },
    }),
    prisma.approval.count({ where: { clientId: session.clientId, status: "PENDING" } }),
    prisma.invoice.findMany({
      where: { clientId: session.clientId, status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
      select: { total: true, amountPaid: true },
    }),
    prisma.ticket.count({ where: { clientId: session.clientId, status: { in: ["OPEN", "IN_PROGRESS"] } } }),
  ]);

  const outstanding = invoices.reduce((sum, i) => sum + (i.total - i.amountPaid), 0);

  const tiles = [
    { label: "Active projects", value: String(projects.filter((p) => p.stage === "ACTIVE").length), href: "/portal/projects" },
    { label: "Awaiting your approval", value: String(approvals), href: "/portal/approvals" },
    { label: "Outstanding", value: formatMoney(outstanding), href: "/portal/invoices" },
    { label: "Open requests", value: String(tickets), href: "/portal/tickets" },
  ];

  return (
    <>
      <h1 className="text-2xl font-semibold text-navy-900">Welcome, {session.name.split(" ")[0]}</h1>
      <p className="mt-1 text-sm text-slate-500">Everything we are doing for {session.clientName}.</p>

      <ul className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map((tile) => (
          <li key={tile.label}>
            <Link
              href={tile.href}
              className="block rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold-400/60"
            >
              <p className="text-2xl font-semibold text-navy-900">{tile.value}</p>
              <p className="mt-1 text-sm text-slate-600">{tile.label}</p>
            </Link>
          </li>
        ))}
      </ul>

      <section className="mt-8">
        <h2 className="text-lg font-semibold text-navy-900">Your projects</h2>
        {projects.length ? (
          <ul className="mt-4 space-y-3">
            {projects.map((project) => {
              const done = project.tasks.length;
              const progress = project._count.tasks ? Math.round((done / project._count.tasks) * 100) : 0;
              return (
                <li key={project.id} className="rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-medium text-navy-900">{project.name}</p>
                      <p className="text-xs capitalize text-slate-500">
                        {project.stage.toLowerCase().replace("_", " ")}
                        {project.endDate ? ` · due ${formatDate(project.endDate)}` : ""}
                      </p>
                    </div>
                    <span className="text-sm font-medium text-navy-900">{progress}%</span>
                  </div>
                  <div className="mt-3 h-2 rounded-full bg-slate-100">
                    <div className="h-2 rounded-full bg-gold-500" style={{ width: `${progress}%` }} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-navy-900/20 bg-white px-6 py-10 text-center text-sm text-slate-500">
            No projects yet.
          </p>
        )}
      </section>
    </>
  );
}
