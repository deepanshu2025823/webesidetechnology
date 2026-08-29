import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { NewContentPlanForm } from "@/components/admin/NewContentPlanForm";
import { formatDate } from "@/lib/utils";

export default async function SocialPlansPage() {
  const session = await requireModule("campaigns");

  const [plans, clients, projects] = await Promise.all([
    prisma.contentPlan.findMany({
      orderBy: { month: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { items: true } },
        items: { select: { stage: true } },
      },
    }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.clientProject.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const editable = canEdit(session.role, "campaigns");

  return (
    <>
      <PageHeader
        title="Social media calendars"
        description="One plan per client per month, with the content workflow from idea to published."
      />

      {editable ? (
        <div className="mb-6">
          <NewContentPlanForm clients={clients} projects={projects} />
        </div>
      ) : null}

      {plans.length === 0 ? (
        <EmptyState title="No content plans yet" description="Create a monthly plan for a client to get started." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => {
            const published = plan.items.filter((i) => i.stage === "PUBLISHED").length;
            const pending = plan.items.filter((i) => i.stage === "CLIENT_APPROVAL").length;
            const target = plan.contractedCount || plan._count.items;

            return (
              <li key={plan.id}>
                <Link
                  href={`/admin/campaigns/social/${plan.id}`}
                  className="flex h-full flex-col rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold-400/60"
                >
                  <p className="font-medium text-navy-900">{plan.client.name}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(plan.month, { month: "long", year: "numeric" })}
                  </p>

                  <div className="mt-4 h-2 rounded-full bg-slate-100">
                    <div
                      className="h-2 rounded-full bg-gold-500"
                      style={{ width: `${target ? Math.min(100, (published / target) * 100) : 0}%` }}
                    />
                  </div>
                  <p className="mt-2 text-xs text-slate-500">
                    {published} of {target || "—"} published
                  </p>

                  {pending ? (
                    <div className="mt-3">
                      <Badge tone="warn">{pending} awaiting client</Badge>
                    </div>
                  ) : null}
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
