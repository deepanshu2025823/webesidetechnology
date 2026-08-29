import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { decideReward, savePartner, saveReferral } from "@/app/admin/actions/partners";
import { ReferralStageSelect } from "@/components/admin/ReferralStageSelect";
import { Badge, Card, EmptyState, PageHeader, inputClass } from "@/components/admin/ui";
import { formatDate, formatMoney } from "@/lib/utils";

const REWARD_TONE = { PENDING: "warn", APPROVED: "neutral", PAID: "success", REJECTED: "muted" } as const;
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

export default async function PartnersPage() {
  const session = await requireModule("partners");

  const [partners, leads, clients, pendingRewards] = await Promise.all([
    prisma.partner.findMany({
      orderBy: { name: "asc" },
      include: {
        referrals: {
          orderBy: { createdAt: "desc" },
          include: { lead: { select: { id: true, name: true } }, client: { select: { id: true, name: true } } },
        },
        rewards: { orderBy: { createdAt: "desc" } },
      },
    }),
    prisma.enquiry.findMany({ select: { id: true, name: true }, orderBy: { createdAt: "desc" }, take: 100 }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.partnerReward.findMany({
      where: { status: "PENDING" },
      include: { partner: { select: { name: true } } },
    }),
  ]);

  const editable = canEdit(session.role, "partners");
  const payable = pendingRewards.reduce((sum, r) => sum + r.amount, 0);

  return (
    <>
      <PageHeader
        title="Referral partners"
        description={
          payable
            ? `${formatMoney(payable)} in rewards awaiting approval across ${pendingRewards.length} referral(s).`
            : "Partners, the leads they send, and what they have earned."
        }
      />

      {editable ? (
        <Card title="Add partner" className="mb-6">
          <form
            action={async (formData: FormData) => {
              "use server";
              await savePartner({}, formData);
            }}
            className="grid gap-3 sm:grid-cols-12"
          >
            <input name="name" required placeholder="Partner name" className={`${inputClass} sm:col-span-3`} />
            <input name="company" placeholder="Company" className={`${inputClass} sm:col-span-3`} />
            <input name="email" type="email" placeholder="Email" className={`${inputClass} sm:col-span-3`} />
            <input name="phone" placeholder="Phone" className={`${inputClass} sm:col-span-2`} />
            <input name="taxRef" placeholder="PAN" className={`${inputClass} sm:col-span-1`} />
            <input type="hidden" name="isActive" value="on" />
            <button
              type="submit"
              className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-12"
            >
              Add partner
            </button>
          </form>
        </Card>
      ) : null}

      {partners.length === 0 ? (
        <EmptyState title="No partners yet" description="Add someone who refers business to you." />
      ) : (
        <ul className="space-y-4">
          {partners.map((partner) => {
            const earned = partner.rewards.filter((r) => r.status === "PAID").reduce((s, r) => s + r.amount, 0);
            const owed = partner.rewards
              .filter((r) => r.status === "PENDING" || r.status === "APPROVED")
              .reduce((s, r) => s + r.amount, 0);
            const won = partner.referrals.filter((r) => r.stage === "WON").length;

            return (
              <li key={partner.id} className="rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <p className="font-medium text-navy-900">{partner.name}</p>
                    <p className="text-xs text-slate-500">
                      Code <strong className="text-gold-700">{partner.referralCode}</strong>
                      {partner.company ? ` · ${partner.company}` : ""}
                      {partner.email ? ` · ${partner.email}` : ""}
                    </p>
                  </div>
                  <dl className="flex gap-6 text-sm">
                    <div className="text-right">
                      <dt className="text-xs text-slate-500">Referrals</dt>
                      <dd className="font-medium text-navy-900">
                        {partner.referrals.length} · {won} won
                      </dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-xs text-slate-500">Paid</dt>
                      <dd className="font-medium text-emerald-700">{formatMoney(earned)}</dd>
                    </div>
                    <div className="text-right">
                      <dt className="text-xs text-slate-500">Payable</dt>
                      <dd className="font-medium text-navy-900">{formatMoney(owed)}</dd>
                    </div>
                  </dl>
                </div>

                {partner.referrals.length ? (
                  <ul className="mt-4 divide-y divide-navy-900/5 border-t border-navy-900/5 pt-2">
                    {partner.referrals.map((referral) => (
                      <li key={referral.id} className="flex flex-wrap items-center gap-3 py-2.5 text-sm">
                        <span className="min-w-0 flex-1">
                          <span className="block text-navy-900">
                            {referral.client ? (
                              <Link href={`/admin/clients/${referral.client.id}`} className="hover:text-gold-700">
                                {referral.client.name}
                              </Link>
                            ) : referral.lead ? (
                              <Link href={`/admin/leads/${referral.lead.id}`} className="hover:text-gold-700">
                                {referral.lead.name}
                              </Link>
                            ) : (
                              referral.notes ?? "Referral"
                            )}
                          </span>
                          <span className="block text-xs text-slate-500">
                            {formatDate(referral.createdAt)}
                            {referral.dealValue ? ` · ${formatMoney(referral.dealValue)}` : ""}
                          </span>
                        </span>

                        {editable ? (
                          <ReferralStageSelect id={referral.id} stage={referral.stage} />
                        ) : (
                          <Badge tone={referral.stage === "WON" ? "success" : "neutral"}>{pretty(referral.stage)}</Badge>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {partner.rewards.length ? (
                  <ul className="mt-3 space-y-2 border-t border-navy-900/5 pt-3">
                    {partner.rewards.map((reward) => (
                      <li key={reward.id} className="flex flex-wrap items-center gap-3 text-sm">
                        <span className="font-medium text-navy-900">{formatMoney(reward.amount)}</span>
                        <Badge tone={REWARD_TONE[reward.status]}>{pretty(reward.status)}</Badge>
                        {reward.reference ? <span className="text-xs text-slate-500">{reward.reference}</span> : null}

                        {editable && reward.status !== "PAID" ? (
                          <form action={decideReward.bind(null, reward.id)} className="ml-auto flex items-center gap-1.5">
                            <select
                              name="status"
                              defaultValue={reward.status}
                              aria-label="Reward status"
                              className="rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs"
                            >
                              {["PENDING", "APPROVED", "PAID", "REJECTED"].map((s) => (
                                <option key={s} value={s}>
                                  {pretty(s)}
                                </option>
                              ))}
                            </select>
                            <input
                              name="reference"
                              placeholder="UTR"
                              className="w-24 rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs"
                              aria-label="Payout reference"
                            />
                            <button type="submit" className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white">
                              Save
                            </button>
                          </form>
                        ) : null}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {editable ? (
                  <form
                    action={saveReferral.bind(null, partner.id)}
                    className="mt-4 grid gap-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4 sm:grid-cols-12"
                  >
                    <select name="leadId" defaultValue="" className={`${inputClass} sm:col-span-4`} aria-label="Lead">
                      <option value="">Link a lead</option>
                      {leads.map((l) => (
                        <option key={l.id} value={l.id}>
                          {l.name}
                        </option>
                      ))}
                    </select>
                    <select name="clientId" defaultValue="" className={`${inputClass} sm:col-span-3`} aria-label="Client">
                      <option value="">or a client</option>
                      {clients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <input name="dealValue" type="number" min={0} placeholder="Deal value ₹" className={`${inputClass} sm:col-span-2`} />
                    <input name="notes" placeholder="Notes" className={`${inputClass} sm:col-span-3`} />
                    <button
                      type="submit"
                      className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-12"
                    >
                      Log referral
                    </button>
                  </form>
                ) : null}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
