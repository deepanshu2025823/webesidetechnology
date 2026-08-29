import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { AdCampaignManager } from "@/components/admin/AdCampaignManager";
import { formatMoney } from "@/lib/utils";

export default async function AdCampaignsPage() {
  const session = await requireModule("campaigns");

  const [campaigns, clients, owners] = await Promise.all([
    prisma.adCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        adAccount: { select: { platform: true } },
        owner: { select: { name: true } },
        performance: true,
      },
    }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const rows = campaigns.map((c) => {
    const spend = c.performance.reduce((sum, p) => sum + p.spend, 0);
    return {
      id: c.id,
      name: c.name,
      platform: c.adAccount.platform,
      objective: c.objective,
      status: c.status,
      budget: c.budget,
      managementFee: c.managementFee,
      clientId: c.client.id,
      clientName: c.client.name,
      ownerName: c.owner?.name ?? null,
      spend,
      leads: c.performance.reduce((sum, p) => sum + p.leads, 0),
      conversions: c.performance.reduce((sum, p) => sum + p.conversions, 0),
      revenue: c.performance.reduce((sum, p) => sum + p.revenue, 0),
    };
  });

  const totalSpend = rows.reduce((sum, r) => sum + r.spend, 0);
  const totalLeads = rows.reduce((sum, r) => sum + r.leads, 0);
  const editable = canEdit(session.role, "campaigns");

  return (
    <>
      <PageHeader
        title="Ad campaigns"
        description={
          totalLeads
            ? `${formatMoney(totalSpend)} spent · ${totalLeads} leads · ${formatMoney(Math.round(totalSpend / totalLeads))} average CPL`
            : "Meta and Google campaigns with approval before launch and daily performance entry."
        }
      />

      {rows.length === 0 && !editable ? (
        <EmptyState title="No campaigns yet" description="Ad campaigns appear here once created." />
      ) : (
        <AdCampaignManager rows={rows} clients={clients} owners={owners} editable={editable} />
      )}
    </>
  );
}
