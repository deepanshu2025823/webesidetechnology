import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { saveInfluencerCampaign } from "@/app/admin/actions/partners";
import { InfluencerCampaignStatusSelect } from "@/components/admin/InfluencerCampaignStatusSelect";
import { Badge, Card, EmptyState, PageHeader, inputClass } from "@/components/admin/ui";
import { asArray, formatDate, formatMoney } from "@/lib/utils";

const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export default async function InfluencerCampaignsPage() {
  const session = await requireModule("influencers");

  const [influencers, clients, campaigns] = await Promise.all([
    prisma.influencer.findMany({ orderBy: { name: "asc" } }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.influencerCampaign.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        influencer: { select: { id: true, name: true, handle: true, followers: true } },
        client: { select: { id: true, name: true } },
      },
    }),
  ]);

  const editable = canEdit(session.role, "influencers");
  const committed = campaigns.reduce((sum, c) => sum + c.cost, 0);
  const paid = campaigns.reduce((sum, c) => sum + c.paidAmount, 0);

  return (
    <>
      <PageHeader
        title="Influencer campaigns"
        description={`${campaigns.length} collaboration(s) · ${formatMoney(committed)} committed · ${formatMoney(paid)} paid.`}
        actions={
          <Link
            href="/admin/influencers"
            className="rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
          >
            Influencer database
          </Link>
        }
      />

      {editable && influencers.length ? (
        <Card title="New collaboration" className="mb-6">
          <form
            action={async (formData: FormData) => {
              "use server";
              const influencerId = String(formData.get("influencerId") ?? "");
              if (influencerId) await saveInfluencerCampaign(influencerId, formData);
            }}
            className="grid gap-3 sm:grid-cols-12"
          >
            <select name="influencerId" required defaultValue="" className={`${inputClass} sm:col-span-3`} aria-label="Influencer">
              <option value="">Select influencer</option>
              {influencers.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} {i.handle ? `(${i.handle})` : ""}
                </option>
              ))}
            </select>
            <select name="clientId" defaultValue="" className={`${inputClass} sm:col-span-3`} aria-label="Client">
              <option value="">No client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input name="campaignName" required placeholder="Campaign name" className={`${inputClass} sm:col-span-3`} />
            <input name="cost" type="number" min={0} placeholder="Cost ₹" className={`${inputClass} sm:col-span-1`} />
            <input name="paidAmount" type="number" min={0} placeholder="Paid ₹" className={`${inputClass} sm:col-span-2`} />

            <input
              name="deliverables"
              placeholder="Deliverables, comma separated — 2 reels, 4 stories"
              className={`${inputClass} sm:col-span-6`}
            />
            <input name="startDate" type="date" className={`${inputClass} sm:col-span-3`} aria-label="Start date" />
            <input name="endDate" type="date" className={`${inputClass} sm:col-span-3`} aria-label="End date" />

            <button
              type="submit"
              className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-12"
            >
              Add collaboration
            </button>
          </form>
        </Card>
      ) : null}

      {campaigns.length === 0 ? (
        <EmptyState
          title="No collaborations yet"
          description={
            influencers.length
              ? "Pair an influencer with a client campaign to start tracking deliverables and payment."
              : "Add influencers to the database first."
          }
          action={
            influencers.length ? null : (
              <Link href="/admin/influencers" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white">
                Add influencers
              </Link>
            )
          }
        />
      ) : (
        <ul className="space-y-3">
          {campaigns.map((campaign) => {
            const deliverables = asArray<string>(campaign.deliverables);
            const outstanding = campaign.cost - campaign.paidAmount;

            return (
              <li key={campaign.id} className="rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-medium text-navy-900">{campaign.campaignName}</p>
                    <p className="text-xs text-slate-500">
                      {campaign.influencer.name}
                      {campaign.influencer.handle ? ` (${campaign.influencer.handle})` : ""} ·{" "}
                      {campaign.influencer.followers.toLocaleString("en-IN")} followers
                      {campaign.client ? (
                        <>
                          {" · "}
                          <Link href={`/admin/clients/${campaign.client.id}`} className="hover:text-gold-700">
                            {campaign.client.name}
                          </Link>
                        </>
                      ) : null}
                    </p>
                  </div>

                  {editable ? (
                    <InfluencerCampaignStatusSelect id={campaign.id} status={campaign.status} />
                  ) : (
                    <Badge tone={campaign.status === "COMPLETED" ? "success" : "neutral"}>{pretty(campaign.status)}</Badge>
                  )}
                </div>

                {deliverables.length ? (
                  <ul className="mt-3 flex flex-wrap gap-1.5">
                    {deliverables.map((d) => (
                      <li key={d} className="rounded-full bg-navy-50 px-2.5 py-1 text-[11px] font-medium text-navy-700">
                        {d}
                      </li>
                    ))}
                  </ul>
                ) : null}

                <dl className="mt-4 flex flex-wrap gap-x-6 gap-y-1 border-t border-navy-900/5 pt-3 text-sm">
                  <div>
                    <dt className="text-xs text-slate-500">Cost</dt>
                    <dd className="font-medium text-navy-900">{formatMoney(campaign.cost)}</dd>
                  </div>
                  <div>
                    <dt className="text-xs text-slate-500">Paid</dt>
                    <dd className="font-medium text-emerald-700">{formatMoney(campaign.paidAmount)}</dd>
                  </div>
                  {outstanding > 0 ? (
                    <div>
                      <dt className="text-xs text-slate-500">Outstanding</dt>
                      <dd className="font-medium text-navy-900">{formatMoney(outstanding)}</dd>
                    </div>
                  ) : null}
                  {campaign.startDate ? (
                    <div>
                      <dt className="text-xs text-slate-500">Runs</dt>
                      <dd className="text-slate-600">
                        {formatDate(campaign.startDate)}
                        {campaign.endDate ? ` – ${formatDate(campaign.endDate)}` : ""}
                      </dd>
                    </div>
                  ) : null}
                </dl>
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
