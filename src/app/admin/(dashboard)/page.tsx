import Link from "next/link";
import {
  ArrowUpRight,
  Briefcase,
  Building2,
  FileSignature,
  ListChecks,
  Sparkles,
  Target,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { canView, isOwnScoped, ROLE_LABELS } from "@/lib/permissions";
import { Alert, Badge, Card, PageHeader } from "@/components/admin/ui";
import { cn, formatDate, formatMoney } from "@/lib/utils";

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ denied?: string }>;
}) {
  const session = await requireSession();
  const { denied } = await searchParams;

  const since = new Date();
  since.setDate(since.getDate() - 30);
  const endOfToday = new Date();
  endOfToday.setHours(23, 59, 59, 999);

  const sees = (m: Parameters<typeof canView>[1]) => canView(session.role, m);
  const ownOnly = isOwnScoped(session.role, "tasks");

  const [
    newLeads,
    monthLeads,
    activeClients,
    openQuotationValue,
    activeProjects,
    atRiskProjects,
    myOpenTasks,
    myOverdueTasks,
    publishedPosts,
    liveServices,
    followUps,
    recentLeads,
    recentProjects,
  ] = await Promise.all([
    sees("leads") ? prisma.enquiry.count({ where: { status: "NEW" } }) : 0,
    sees("leads") ? prisma.enquiry.count({ where: { createdAt: { gte: since } } }) : 0,
    sees("clients") ? prisma.client.count({ where: { status: "ACTIVE" } }) : 0,
    sees("quotations")
      ? prisma.quotation.aggregate({ _sum: { total: true }, where: { status: { in: ["SENT", "NEGOTIATION"] } } })
      : null,
    sees("projects") ? prisma.clientProject.count({ where: { stage: "ACTIVE" } }) : 0,
    sees("projects") ? prisma.clientProject.count({ where: { health: { in: ["AT_RISK", "DELAYED"] } } }) : 0,
    sees("tasks") ? prisma.task.count({ where: { assigneeId: session.id, status: { not: "DONE" } } }) : 0,
    sees("tasks")
      ? prisma.task.count({
          where: { assigneeId: session.id, status: { not: "DONE" }, dueDate: { lte: endOfToday } },
        })
      : 0,
    sees("website") ? prisma.post.count({ where: { status: "PUBLISHED" } }) : 0,
    sees("website") ? prisma.service.count({ where: { status: "PUBLISHED" } }) : 0,
    sees("leads")
      ? prisma.enquiry.findMany({
          where: {
            nextFollowUpAt: { lte: endOfToday },
            status: { notIn: ["WON", "LOST"] },
            ...(session.role === "SALES" ? { ownerId: session.id } : {}),
          },
          orderBy: { nextFollowUpAt: "asc" },
          take: 6,
          include: { owner: { select: { name: true } } },
        })
      : [],
    sees("leads")
      ? prisma.enquiry.findMany({ orderBy: { createdAt: "desc" }, take: 6, include: { owner: { select: { name: true } } } })
      : [],
    sees("projects")
      ? prisma.clientProject.findMany({
          where: ownOnly ? { OR: [{ managerId: session.id }, { tasks: { some: { assigneeId: session.id } } }] } : {},
          orderBy: { updatedAt: "desc" },
          take: 5,
          include: { client: { select: { name: true } } },
        })
      : [],
  ]);

  const tiles = [
    sees("leads") && {
      label: "New leads",
      value: newLeads,
      sub: `${monthLeads} in the last 30 days`,
      icon: Target,
      href: "/admin/leads?status=NEW",
    },
    sees("clients") && {
      label: "Active clients",
      value: activeClients,
      sub: "Currently engaged",
      icon: Building2,
      href: "/admin/clients?status=ACTIVE",
    },
    sees("quotations") && {
      label: "Quotes in play",
      value: formatMoney(openQuotationValue?._sum.total ?? 0),
      sub: "Sent and negotiating",
      icon: FileSignature,
      href: "/admin/quotations",
    },
    sees("projects") && {
      label: "Active projects",
      value: activeProjects,
      sub: atRiskProjects ? `${atRiskProjects} need attention` : "All on track",
      icon: Briefcase,
      href: "/admin/client-projects?stage=ACTIVE",
    },
    sees("tasks") && {
      label: "My open tasks",
      value: myOpenTasks,
      sub: myOverdueTasks ? `${myOverdueTasks} overdue` : "Nothing overdue",
      icon: ListChecks,
      href: "/admin/tasks",
    },
    sees("website") && {
      label: "Live services",
      value: liveServices,
      sub: `${publishedPosts} published posts`,
      icon: Sparkles,
      href: "/admin/services",
    },
  ].filter(Boolean) as { label: string; value: number | string; sub: string; icon: typeof Target; href: string }[];

  return (
    <>
      <PageHeader
        title={`Welcome back, ${session.name.split(" ")[0]}`}
        description={`Signed in as ${ROLE_LABELS[session.role]}.`}
      />

      {denied ? (
        <div className="mb-6">
          <Alert tone="error">
            You don&apos;t have access to the {denied} section. Ask a Super Admin if you need it.
          </Alert>
        </div>
      ) : null}

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {tiles.map(({ label, value, sub, icon: Icon, href }) => (
          <li key={label}>
            <Link
              href={href}
              className="group flex items-start gap-4 rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold-400/60 hover:shadow-brand"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-gold-400">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-2xl font-semibold text-navy-900">{value}</span>
                <span className="mt-0.5 block text-sm font-medium text-navy-800">{label}</span>
                <span className="mt-0.5 block text-xs text-slate-500">{sub}</span>
              </span>
              <ArrowUpRight className="size-4 shrink-0 text-slate-300 transition-colors group-hover:text-gold-600" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {sees("leads") ? (
          <Card title="Follow-ups due" description="Leads whose next contact date has arrived.">
            {followUps.length ? (
              <ul className="divide-y divide-navy-900/5">
                {followUps.map((lead) => (
                  <li key={lead.id}>
                    <Link
                      href={`/admin/leads/${lead.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-slate-50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-navy-900">{lead.name}</span>
                        <span className="block truncate text-xs text-slate-500">
                          {lead.serviceInterest || "General"} · {lead.owner?.name ?? "Unassigned"}
                        </span>
                      </span>
                      <span
                        className={cn(
                          "shrink-0 text-xs",
                          lead.nextFollowUpAt && lead.nextFollowUpAt < new Date() ? "font-medium text-red-600" : "text-slate-400",
                        )}
                      >
                        {lead.nextFollowUpAt ? formatDate(lead.nextFollowUpAt) : ""}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">Nothing due. Good place to be.</p>
            )}
          </Card>
        ) : null}

        {sees("projects") ? (
          <Card title="Recent project activity">
            {recentProjects.length ? (
              <ul className="divide-y divide-navy-900/5">
                {recentProjects.map((p) => (
                  <li key={p.id}>
                    <Link
                      href={`/admin/client-projects/${p.id}`}
                      className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-slate-50"
                    >
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-sm font-medium text-navy-900">{p.name}</span>
                        <span className="block truncate text-xs text-slate-500">{p.client.name}</span>
                      </span>
                      <Badge tone={p.health === "ON_TRACK" ? "success" : p.health === "AT_RISK" ? "warn" : "muted"}>
                        {p.stage.toLowerCase()}
                      </Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="py-6 text-center text-sm text-slate-500">No projects yet.</p>
            )}
          </Card>
        ) : null}

        {sees("leads") && !sees("projects") ? (
          <Card title="Latest enquiries">
            <ul className="divide-y divide-navy-900/5">
              {recentLeads.map((lead) => (
                <li key={lead.id}>
                  <Link
                    href={`/admin/leads/${lead.id}`}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-slate-50"
                  >
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-navy-900">{lead.name}</span>
                      <span className="block truncate text-xs text-slate-500">{lead.email}</span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{formatDate(lead.createdAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Card>
        ) : null}

        {!sees("leads") && !sees("projects") ? (
          <Card title="Your workspace">
            <p className="text-sm text-slate-600">
              Your role covers {sees("website") ? "website content" : "assigned work"}. Use the sidebar to get to it.
            </p>
          </Card>
        ) : null}
      </div>
    </>
  );
}
