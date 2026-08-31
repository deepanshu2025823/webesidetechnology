import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { saveSocialReport } from "@/app/admin/actions/campaigns";
import { Card, PageHeader, inputClass } from "@/components/admin/ui";
import { ContentBoard } from "@/components/admin/ContentBoard";
import { formatDate } from "@/lib/utils";

export default async function ContentPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModule("campaigns");
  const { id } = await params;

  const plan = await prisma.contentPlan.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      items: {
        orderBy: { createdAt: "asc" },
        include: {
          owner: { select: { name: true } },
          comments: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
        },
      },
      reports: { orderBy: { createdAt: "desc" } },
    },
  });
  if (!plan) notFound();

  const owners = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true, role: true },
    orderBy: { name: "asc" },
  });

  const editable = canEdit(session.role, "campaigns");
  const published = plan.items.filter((i) => i.stage === "PUBLISHED").length;
  const missed = plan.contractedCount ? Math.max(0, plan.contractedCount - plan.items.length) : 0;
  const report = saveSocialReport.bind(null, plan.id);

  return (
    <>
      <Link
        href="/admin/campaigns/social"
        className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900"
      >
        <ArrowLeft className="size-4" aria-hidden /> All content plans
      </Link>

      <PageHeader
        title={`${plan.client.name} — ${formatDate(plan.month, { month: "long", year: "numeric" })}`}
        description={`${published} published of ${plan.contractedCount || plan.items.length} planned${missed ? ` · ${missed} still to be created` : ""}`}
      />

      <Card title="Content" className="mb-6">
        <ContentBoard
          planId={plan.id}
          editable={editable}
          owners={owners}
          items={plan.items.map((i) => ({
            id: i.id,
            title: i.title,
            type: i.type,
            platform: i.platform,
            stage: i.stage,
            scheduledAt: i.scheduledAt ? i.scheduledAt.toISOString() : null,
            owner: i.owner?.name ?? null,
            revisionCount: i.revisionCount,
            comments: i.comments.map((c) => ({
              id: c.id,
              body: c.body,
              author: c.author?.name ?? "Team",
              createdAt: c.createdAt.toISOString(),
            })),
          }))}
        />
      </Card>

      <Card title="Monthly report" description="Reach, impressions, engagement and follower growth.">
        {editable ? (
          <form action={report} className="mb-5 grid gap-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4 sm:grid-cols-12">
            <input name="reach" type="number" min={0} placeholder="Reach" className={`${inputClass} sm:col-span-3`} />
            <input name="impressions" type="number" min={0} placeholder="Impressions" className={`${inputClass} sm:col-span-3`} />
            <input name="engagement" type="number" min={0} placeholder="Engagement" className={`${inputClass} sm:col-span-3`} />
            <input name="followers" type="number" min={0} placeholder="Followers" className={`${inputClass} sm:col-span-3`} />
            <input name="notes" placeholder="Notes for the client" className={`${inputClass} sm:col-span-9`} />
            <button
              type="submit"
              className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-3"
            >
              Save report
            </button>
          </form>
        ) : null}

        {plan.reports.length ? (
          <ul className="divide-y divide-navy-900/5">
            {plan.reports.map((r) => (
              <li key={r.id} className="py-3">
                <div className="flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <span className="text-slate-600">
                    Reach <strong className="text-navy-900">{r.reach.toLocaleString("en-IN")}</strong>
                  </span>
                  <span className="text-slate-600">
                    Impressions <strong className="text-navy-900">{r.impressions.toLocaleString("en-IN")}</strong>
                  </span>
                  <span className="text-slate-600">
                    Engagement <strong className="text-navy-900">{r.engagement.toLocaleString("en-IN")}</strong>
                  </span>
                  <span className="text-slate-600">
                    Followers <strong className="text-navy-900">{r.followers.toLocaleString("en-IN")}</strong>
                  </span>
                  <span className="ml-auto text-xs text-slate-400">{formatDate(r.createdAt)}</span>
                </div>
                {r.notes ? <p className="mt-1 text-xs text-slate-500">{r.notes}</p> : null}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No report recorded yet.</p>
        )}
      </Card>
    </>
  );
}
