"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity, requirePermission } from "@/lib/auth";
import { managementUserIds, notify } from "@/lib/notify";
import type { ActionState } from "@/app/admin/actions/collections";

export type { ActionState };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string, fallback = 0) => {
  const raw = str(f, k).replace(/,/g, "");
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : fallback;
};
const nullable = (f: FormData, k: string) => str(f, k) || null;

/** Referral codes are short, readable and unique. */
async function nextReferralCode(name: string) {
  const base = name.replace(/[^a-zA-Z]/g, "").slice(0, 6).toUpperCase() || "PARTNER";
  const existing = await prisma.partner.findMany({
    where: { referralCode: { startsWith: base } },
    select: { referralCode: true },
  });
  const taken = new Set(existing.map((p) => p.referralCode));

  let n = taken.size + 1;
  let code = `${base}${String(n).padStart(2, "0")}`;
  while (taken.has(code)) {
    n += 1;
    code = `${base}${String(n).padStart(2, "0")}`;
  }
  return code;
}

export async function savePartner(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("partners", "write");
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return { error: "Give the partner a name." };

  const data = {
    name,
    email: str(form, "email"),
    phone: str(form, "phone"),
    company: str(form, "company"),
    taxRef: str(form, "taxRef"),
    isActive: form.get("isActive") !== null,
    notes: str(form, "notes") || null,
  };

  try {
    if (id) await prisma.partner.update({ where: { id }, data });
    else await prisma.partner.create({ data: { ...data, referralCode: await nextReferralCode(name) } });
  } catch (error) {
    console.error("[partners] save", error);
    return { error: "Could not save this partner." };
  }

  await logActivity(session.id, id ? "update" : "create", "Partner", id || undefined, name);
  revalidatePath("/admin/partners");
  return { ok: true, message: "Partner saved." };
}

export async function deletePartner(id: string): Promise<void> {
  const session = await requirePermission("partners", "write");
  await prisma.partnerReward.deleteMany({ where: { partnerId: id } });
  await prisma.partnerReferral.deleteMany({ where: { partnerId: id } });
  await prisma.partner.delete({ where: { id } });
  await logActivity(session.id, "delete", "Partner", id);
  revalidatePath("/admin/partners");
}

export async function saveReferral(partnerId: string, form: FormData): Promise<void> {
  await requirePermission("partners", "write");
  const leadId = nullable(form, "leadId");
  const clientId = nullable(form, "clientId");
  if (!leadId && !clientId && !str(form, "notes")) return;

  await prisma.partnerReferral.create({
    data: {
      partnerId,
      leadId,
      clientId,
      stage: (str(form, "stage") || "REFERRED") as never,
      dealValue: int(form, "dealValue"),
      notes: str(form, "notes") || null,
    },
  });

  revalidatePath("/admin/partners");
}

/**
 * Moving a referral to WON calculates the reward from the matching rule.
 * Nothing is paid until a human approves it.
 */
export async function setReferralStage(id: string, stage: string): Promise<void> {
  const session = await requirePermission("partners", "write");

  const referral = await prisma.partnerReferral.update({
    where: { id },
    data: { stage: stage as never, wonAt: stage === "WON" ? new Date() : null },
    include: { partner: { select: { name: true } } },
  });

  if (stage === "WON" && referral.dealValue > 0) {
    const existing = await prisma.partnerReward.findFirst({ where: { referralId: id } });
    if (!existing) {
      const rule = await prisma.rewardRule.findFirst({ where: { isActive: true }, orderBy: { createdAt: "asc" } });

      let amount = 0;
      if (rule) {
        if (rule.type === "PERCENTAGE") amount = Math.round((referral.dealValue * rule.value) / 100);
        else if (rule.type === "FIXED") amount = rule.value;
        else {
          // Slab rules pay the band the deal value falls into.
          const slabs = Array.isArray(rule.slabs) ? (rule.slabs as { upTo: number; value: number }[]) : [];
          const band = slabs.find((s) => referral.dealValue <= s.upTo) ?? slabs[slabs.length - 1];
          amount = band ? Math.round((referral.dealValue * band.value) / 100) : 0;
        }
      }

      if (amount > 0) {
        await prisma.partnerReward.create({
          data: { partnerId: referral.partnerId, referralId: id, ruleId: rule?.id ?? null, amount },
        });

        await notify({
          userIds: await managementUserIds(),
          type: "partner_reward_pending",
          title: `Reward due to ${referral.partner.name}`,
          body: `₹${amount.toLocaleString("en-IN")} pending approval.`,
          url: "/admin/partners",
          entity: "PartnerReward",
          entityId: id,
        });
      }
    }
  }

  await logActivity(session.id, "update", "PartnerReferral", id, stage);
  revalidatePath("/admin/partners");
}

export async function decideReward(id: string, form: FormData): Promise<void> {
  const session = await requirePermission("partners", "write");
  const status = str(form, "status");

  await prisma.partnerReward.update({
    where: { id },
    data: {
      status: status as never,
      approvedById: session.id,
      approvedAt: status === "APPROVED" || status === "PAID" ? new Date() : null,
      paidAt: status === "PAID" ? new Date() : null,
      reference: str(form, "reference") || undefined,
    },
  });

  await logActivity(session.id, "update", "PartnerReward", id, status);
  revalidatePath("/admin/partners");
}

// ------------------------------------------------------------------ influencers

export async function saveInfluencerCampaign(influencerId: string, form: FormData): Promise<void> {
  const session = await requirePermission("influencers", "write");
  const campaignName = str(form, "campaignName");
  if (!campaignName) return;

  const deliverables = str(form, "deliverables")
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);

  await prisma.influencerCampaign.create({
    data: {
      influencerId,
      clientId: nullable(form, "clientId"),
      campaignName,
      deliverables,
      startDate: str(form, "startDate") ? new Date(str(form, "startDate")) : null,
      endDate: str(form, "endDate") ? new Date(str(form, "endDate")) : null,
      status: (str(form, "status") || "SHORTLISTED") as never,
      cost: int(form, "cost"),
      paidAmount: int(form, "paidAmount"),
      notes: str(form, "notes") || null,
    },
  });

  await logActivity(session.id, "create", "InfluencerCampaign", influencerId, campaignName);
  revalidatePath("/admin/influencers");
}

export async function setInfluencerCampaignStatus(id: string, status: string): Promise<void> {
  await requirePermission("influencers", "write");
  await prisma.influencerCampaign.update({ where: { id }, data: { status: status as never } });
  revalidatePath("/admin/influencers");
}
