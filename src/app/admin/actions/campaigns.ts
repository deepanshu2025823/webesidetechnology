"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { logActivity, requirePermission } from "@/lib/auth";
import { notify } from "@/lib/notify";
import type { Prisma } from "@/generated/prisma/client";
import type { ActionState } from "@/app/admin/actions/collections";

export type { ActionState };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string, fallback = 0) => {
  const raw = str(f, k).replace(/,/g, "");
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : fallback;
};
const date = (f: FormData, k: string) => {
  const raw = str(f, k);
  return raw ? new Date(raw) : null;
};
const nullable = (f: FormData, k: string) => str(f, k) || null;

/** Months are stored as the first day, so a client has one plan per month. */
function monthStart(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, 1);
}

// ------------------------------------------------------------------ social

export async function createContentPlan(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("campaigns", "write");
  const clientId = str(form, "clientId");
  const month = str(form, "month");
  if (!clientId || !month) return { error: "Pick a client and a month." };

  try {
    const plan = await prisma.contentPlan.create({
      data: {
        clientId,
        projectId: nullable(form, "projectId"),
        month: monthStart(month),
        contractedCount: int(form, "contractedCount"),
        notes: str(form, "notes") || null,
      },
    });
    await logActivity(session.id, "create", "ContentPlan", plan.id, month);
    revalidatePath("/admin/campaigns/social");
    redirect(`/admin/campaigns/social/${plan.id}`);
  } catch (error) {
    if (error instanceof Error && error.message.includes("NEXT_REDIRECT")) throw error;
    console.error("[campaigns] createContentPlan", error);
    return { error: "That client already has a plan for this month." };
  }
}

export async function saveContentItem(planId: string, form: FormData): Promise<void> {
  await requirePermission("campaigns", "write");
  const id = str(form, "itemId");
  const title = str(form, "title");
  if (!title) return;

  const stage = str(form, "stage") || "IDEA";
  const data = {
    planId,
    title,
    type: (str(form, "type") || "POST") as never,
    platform: (str(form, "platform") || "INSTAGRAM") as never,
    caption: str(form, "caption") || null,
    hashtags: str(form, "hashtags") || null,
    assetUrl: str(form, "assetUrl"),
    stage: stage as never,
    scheduledAt: date(form, "scheduledAt"),
    publishedAt: stage === "PUBLISHED" ? new Date() : null,
    publishedUrl: str(form, "publishedUrl"),
    ownerId: nullable(form, "ownerId"),
  };

  if (id) {
    // Bouncing back to revision counts against the contracted revision budget.
    const before = await prisma.contentItem.findUnique({ where: { id }, select: { stage: true, revisionCount: true } });
    const bumped = before && before.stage !== "REVISION" && stage === "REVISION";
    await prisma.contentItem.update({
      where: { id },
      data: { ...data, ...(bumped ? { revisionCount: before.revisionCount + 1 } : {}) },
    });
  } else {
    await prisma.contentItem.create({ data });
  }

  revalidatePath(`/admin/campaigns/social/${planId}`);
}

export async function setContentStage(id: string, stage: string): Promise<void> {
  await requirePermission("campaigns", "write");
  const item = await prisma.contentItem.findUnique({ where: { id }, select: { planId: true, stage: true, revisionCount: true } });
  if (!item) return;

  await prisma.contentItem.update({
    where: { id },
    data: {
      stage: stage as never,
      publishedAt: stage === "PUBLISHED" ? new Date() : null,
      revisionCount: item.stage !== "REVISION" && stage === "REVISION" ? item.revisionCount + 1 : item.revisionCount,
    },
  });

  revalidatePath(`/admin/campaigns/social/${item.planId}`);
}

export async function deleteContentItem(id: string): Promise<void> {
  await requirePermission("campaigns", "write");
  const item = await prisma.contentItem.findUnique({ where: { id }, select: { planId: true } });
  await prisma.contentComment.deleteMany({ where: { contentItemId: id } });
  await prisma.contentItem.delete({ where: { id } });
  if (item) revalidatePath(`/admin/campaigns/social/${item.planId}`);
}

export async function addContentComment(itemId: string, form: FormData): Promise<void> {
  const session = await requirePermission("campaigns", "write");
  const body = str(form, "body");
  if (!body) return;

  const item = await prisma.contentItem.findUnique({ where: { id: itemId }, select: { planId: true } });
  await prisma.contentComment.create({ data: { contentItemId: itemId, authorId: session.id, body } });
  if (item) revalidatePath(`/admin/campaigns/social/${item.planId}`);
}

export async function saveSocialReport(planId: string, form: FormData): Promise<void> {
  await requirePermission("campaigns", "write");
  await prisma.socialReport.create({
    data: {
      planId,
      reach: int(form, "reach"),
      impressions: int(form, "impressions"),
      engagement: int(form, "engagement"),
      followers: int(form, "followers"),
      notes: str(form, "notes") || null,
    },
  });
  revalidatePath(`/admin/campaigns/social/${planId}`);
}

// ------------------------------------------------------------------ seo

export async function createSeoPlan(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("campaigns", "write");
  const clientId = str(form, "clientId");
  if (!clientId) return { error: "Pick a client." };

  const plan = await prisma.seoPlan.create({
    data: {
      clientId,
      projectId: nullable(form, "projectId"),
      website: str(form, "website"),
      notes: str(form, "notes") || null,
    },
  });

  await logActivity(session.id, "create", "SeoPlan", plan.id, str(form, "website"));
  revalidatePath("/admin/campaigns/seo");
  redirect(`/admin/campaigns/seo/${plan.id}`);
}

export async function saveKeyword(seoPlanId: string, form: FormData): Promise<void> {
  await requirePermission("campaigns", "write");
  const id = str(form, "keywordId");
  const term = str(form, "term");
  if (!term) return;

  const data = {
    seoPlanId,
    term,
    targetUrl: str(form, "targetUrl"),
    priority: (str(form, "priority") || "MEDIUM") as never,
    intent: str(form, "intent") || "Informational",
    volume: int(form, "volume"),
    currentPosition: str(form, "currentPosition") ? int(form, "currentPosition") : null,
    targetPosition: str(form, "targetPosition") ? int(form, "targetPosition") : null,
    lastCheckedAt: str(form, "currentPosition") ? new Date() : null,
  };

  if (id) await prisma.keyword.update({ where: { id }, data });
  else await prisma.keyword.create({ data });

  revalidatePath(`/admin/campaigns/seo/${seoPlanId}`);
}

export async function deleteKeyword(id: string): Promise<void> {
  await requirePermission("campaigns", "write");
  const kw = await prisma.keyword.findUnique({ where: { id }, select: { seoPlanId: true } });
  await prisma.keyword.delete({ where: { id } });
  if (kw) revalidatePath(`/admin/campaigns/seo/${kw.seoPlanId}`);
}

export async function saveSeoTask(seoPlanId: string, form: FormData): Promise<void> {
  await requirePermission("campaigns", "write");
  const title = str(form, "title");
  if (!title) return;

  const status = str(form, "status") || "PLANNED";
  await prisma.seoTask.create({
    data: {
      seoPlanId,
      title,
      category: (str(form, "category") || "ON_PAGE") as never,
      status: status as never,
      month: date(form, "month"),
      assigneeId: nullable(form, "assigneeId"),
      completedAt: status === "DONE" ? new Date() : null,
      notes: str(form, "notes") || null,
    },
  });
  revalidatePath(`/admin/campaigns/seo/${seoPlanId}`);
}

export async function setSeoTaskStatus(id: string, status: string): Promise<void> {
  await requirePermission("campaigns", "write");
  const task = await prisma.seoTask.findUnique({ where: { id }, select: { seoPlanId: true } });
  await prisma.seoTask.update({
    where: { id },
    data: { status: status as never, completedAt: status === "DONE" ? new Date() : null },
  });
  if (task) revalidatePath(`/admin/campaigns/seo/${task.seoPlanId}`);
}

export async function saveBacklink(seoPlanId: string, form: FormData): Promise<void> {
  await requirePermission("campaigns", "write");
  const sourceUrl = str(form, "sourceUrl");
  if (!sourceUrl) return;

  await prisma.backlink.create({
    data: {
      seoPlanId,
      sourceUrl,
      targetUrl: str(form, "targetUrl"),
      anchor: str(form, "anchor"),
      authority: int(form, "authority"),
      status: (str(form, "status") || "PLANNED") as never,
      acquiredAt: date(form, "acquiredAt"),
    },
  });
  revalidatePath(`/admin/campaigns/seo/${seoPlanId}`);
}

export async function saveSeoReport(seoPlanId: string, form: FormData): Promise<void> {
  await requirePermission("campaigns", "write");
  const month = str(form, "month");
  if (!month) return;

  await prisma.seoReport.create({
    data: {
      seoPlanId,
      month: monthStart(month),
      organicTraffic: int(form, "organicTraffic"),
      keywordsTop3: int(form, "keywordsTop3"),
      keywordsTop10: int(form, "keywordsTop10"),
      notes: str(form, "notes") || null,
    },
  });
  revalidatePath(`/admin/campaigns/seo/${seoPlanId}`);
}

// ------------------------------------------------------------------ ads

export async function saveAdCampaign(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("campaigns", "write");
  const id = str(form, "id");
  const name = str(form, "name");
  const clientId = str(form, "clientId");
  const platform = str(form, "platform") || "META";

  if (!clientId) return { error: "Pick a client." };
  if (!name) return { error: "Give the campaign a name." };

  // Each client gets one ad account per platform, created on first use.
  let account = await prisma.adAccount.findFirst({ where: { clientId, platform: platform as never } });
  if (!account) {
    account = await prisma.adAccount.create({
      data: { clientId, platform: platform as never, accountRef: str(form, "accountRef") },
    });
  }

  const data = {
    adAccountId: account.id,
    clientId,
    name,
    objective: str(form, "objective") || "Leads",
    status: (str(form, "status") || "DRAFT") as never,
    budget: int(form, "budget"),
    managementFee: int(form, "managementFee"),
    landingUrl: str(form, "landingUrl"),
    creativeNotes: str(form, "creativeNotes") || null,
    startDate: date(form, "startDate"),
    endDate: date(form, "endDate"),
    ownerId: nullable(form, "ownerId") ?? session.id,
  };

  try {
    if (id) await prisma.adCampaign.update({ where: { id }, data });
    else await prisma.adCampaign.create({ data });
  } catch (error) {
    console.error("[campaigns] saveAdCampaign", error);
    return { error: "Could not save this campaign." };
  }

  await logActivity(session.id, id ? "update" : "create", "AdCampaign", id || undefined, name);
  revalidatePath("/admin/campaigns/ads");
  return { ok: true, message: "Campaign saved." };
}

/** Scope section 11 requires sign-off before a campaign can go live. */
export async function approveAdCampaign(id: string): Promise<void> {
  const session = await requirePermission("campaigns", "write");

  const campaign = await prisma.adCampaign.update({
    where: { id },
    data: { status: "APPROVED", approvedById: session.id, approvedAt: new Date() },
    include: { client: { select: { name: true } } },
  });

  if (campaign.ownerId) {
    await notify({
      userIds: [campaign.ownerId],
      type: "campaign_approved",
      title: `${campaign.name} approved`,
      body: `${campaign.client.name} — ready to launch.`,
      url: "/admin/campaigns/ads",
      entity: "AdCampaign",
      entityId: id,
    });
  }

  await logActivity(session.id, "approve", "AdCampaign", id, campaign.name);
  revalidatePath("/admin/campaigns/ads");
}

export async function setAdCampaignStatus(id: string, status: string): Promise<void> {
  await requirePermission("campaigns", "write");
  await prisma.adCampaign.update({ where: { id }, data: { status: status as never } });
  revalidatePath("/admin/campaigns/ads");
}

export async function deleteAdCampaign(id: string): Promise<void> {
  await requirePermission("campaigns", "write");
  await prisma.adPerformance.deleteMany({ where: { campaignId: id } });
  await prisma.adCampaign.delete({ where: { id } });
  revalidatePath("/admin/campaigns/ads");
}

/** Manual performance entry; an API sync can write the same rows later. */
export async function recordAdPerformance(campaignId: string, form: FormData): Promise<void> {
  await requirePermission("campaigns", "write");
  const day = date(form, "date");
  if (!day) return;

  const values = {
    spend: int(form, "spend"),
    impressions: int(form, "impressions"),
    clicks: int(form, "clicks"),
    leads: int(form, "leads"),
    conversions: int(form, "conversions"),
    revenue: int(form, "revenue"),
  };

  await prisma.adPerformance.upsert({
    where: { campaignId_date: { campaignId, date: day } },
    create: { campaignId, date: day, ...values },
    update: values,
  });

  revalidatePath("/admin/campaigns/ads");
}

// ------------------------------------------------------------------ pr

export async function savePrActivity(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("campaigns", "write");
  const id = str(form, "id");
  const clientId = str(form, "clientId");
  const objective = str(form, "objective");

  if (!clientId) return { error: "Pick a client." };
  if (!objective) return { error: "Describe the PR objective." };

  const data = {
    clientId,
    objective,
    storyTitle: str(form, "storyTitle"),
    stage: (str(form, "stage") || "BRIEF") as never,
    material: str(form, "material") || null,
    ownerId: nullable(form, "ownerId") ?? session.id,
  };

  if (id) await prisma.prActivity.update({ where: { id }, data });
  else await prisma.prActivity.create({ data });

  await logActivity(session.id, id ? "update" : "create", "PrActivity", id || undefined, objective);
  revalidatePath("/admin/campaigns/pr");
  return { ok: true, message: "PR activity saved." };
}

export async function savePrPitch(activityId: string, form: FormData): Promise<void> {
  await requirePermission("campaigns", "write");
  const publication = str(form, "publication");
  if (!publication && !str(form, "mediaContactId")) return;

  await prisma.prPitch.create({
    data: {
      activityId,
      mediaContactId: nullable(form, "mediaContactId"),
      publication,
      pitchedAt: date(form, "pitchedAt") ?? new Date(),
      publishedUrl: str(form, "publishedUrl"),
      publishedAt: date(form, "publishedAt"),
      reach: int(form, "reach"),
      status: (str(form, "status") || "PLANNED") as never,
    },
  });
  revalidatePath("/admin/campaigns/pr");
}

export async function deletePrActivity(id: string): Promise<void> {
  await requirePermission("campaigns", "write");
  await prisma.prPitch.deleteMany({ where: { activityId: id } });
  await prisma.prActivity.delete({ where: { id } });
  revalidatePath("/admin/campaigns/pr");
}

export type CampaignJson = Prisma.InputJsonValue;
