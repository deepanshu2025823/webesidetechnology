"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { logActivity, requirePermission } from "@/lib/auth";
import { alertNewClient, alertNewLead } from "@/lib/alerts";
import { nextCode } from "@/lib/admin/sequence";
import { toBillingCycle } from "@/lib/billing";
import type { Prisma } from "@/generated/prisma/client";
import type { ActionState } from "@/app/admin/actions/collections";

export type { ActionState };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const bool = (f: FormData, k: string) => f.get(k) === "on" || f.get(k) === "true";
const int = (f: FormData, k: string, fallback = 0) => {
  const raw = str(f, k);
  if (!raw) return fallback;
  const n = Number(raw.replace(/,/g, ""));
  return Number.isFinite(n) ? Math.round(n) : fallback;
};
const date = (f: FormData, k: string) => {
  const raw = str(f, k);
  return raw ? new Date(raw) : null;
};
const nullable = (f: FormData, k: string) => str(f, k) || null;

function jsonArray(f: FormData, k: string): Prisma.InputJsonValue {
  const raw = str(f, k);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Prisma.InputJsonValue) : [];
  } catch {
    return [];
  }
}

// ------------------------------------------------------------------ clients

export async function saveClient(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("clients", "write");
  const id = str(form, "id");
  const name = str(form, "name");
  if (!name) return { error: "Company name is required." };

  const data = {
    name,
    industry: str(form, "industry"),
    website: str(form, "website"),
    gstin: str(form, "gstin"),
    status: (str(form, "status") || "PROSPECT") as never,
    tags: jsonArray(form, "tags"),
    addressLine: str(form, "addressLine"),
    city: str(form, "city"),
    state: str(form, "state"),
    postalCode: str(form, "postalCode"),
    country: str(form, "country") || "India",
    notes: str(form, "notes") || null,
    healthScore: Math.max(0, Math.min(100, int(form, "healthScore", 70))),
    ownerId: nullable(form, "ownerId"),
  };

  let clientId = id;
  try {
    if (id) {
      await prisma.client.update({ where: { id }, data });
    } else {
      const created = await prisma.client.create({ data: { ...data, code: await nextCode("client") } });
      clientId = created.id;
      await alertNewClient(clientId, session.name);
    }
  } catch (error) {
    console.error("[crm] saveClient", error);
    return { error: "Could not save this client." };
  }

  await logActivity(session.id, id ? "update" : "create", "Client", clientId, name);
  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${clientId}`);
}

export async function deleteClient(id: string) {
  const session = await requirePermission("clients", "write");

  const [projects, quotations] = await Promise.all([
    prisma.clientProject.count({ where: { clientId: id } }),
    prisma.quotation.count({ where: { clientId: id } }),
  ]);
  if (projects || quotations) {
    // Deleting would orphan delivery and commercial history.
    return { error: "This client has projects or quotations. Archive it instead of deleting." };
  }

  await prisma.clientContact.deleteMany({ where: { clientId: id } });
  await prisma.clientActivity.deleteMany({ where: { clientId: id } });
  await prisma.enquiry.updateMany({ where: { clientId: id }, data: { clientId: null } });
  await prisma.client.delete({ where: { id } });

  await logActivity(session.id, "delete", "Client", id);
  revalidatePath("/admin/clients");
  redirect("/admin/clients");
}

export async function saveContact(clientId: string, form: FormData): Promise<void> {
  await requirePermission("clients", "write");
  const id = str(form, "contactId");
  const name = str(form, "name");
  if (!name) return;

  const data = {
    clientId,
    name,
    designation: str(form, "designation"),
    email: str(form, "email"),
    phone: str(form, "phone"),
    whatsapp: str(form, "whatsapp"),
    isPrimary: bool(form, "isPrimary"),
  };

  if (data.isPrimary) {
    await prisma.clientContact.updateMany({ where: { clientId }, data: { isPrimary: false } });
  }

  if (id) await prisma.clientContact.update({ where: { id }, data });
  else await prisma.clientContact.create({ data });

  revalidatePath(`/admin/clients/${clientId}`);
}

export async function deleteContact(clientId: string, id: string): Promise<void> {
  await requirePermission("clients", "write");
  await prisma.clientContact.delete({ where: { id } });
  revalidatePath(`/admin/clients/${clientId}`);
}

export async function addClientActivity(clientId: string, form: FormData): Promise<void> {
  const session = await requirePermission("clients", "write");
  const body = str(form, "body");
  if (!body) return;

  await prisma.clientActivity.create({
    data: {
      clientId,
      authorId: session.id,
      type: (str(form, "type") || "NOTE") as never,
      subject: str(form, "subject"),
      body,
      dueAt: date(form, "dueAt"),
    },
  });

  revalidatePath(`/admin/clients/${clientId}`);
}

// ------------------------------------------------------------------ leads

/**
 * Create a lead by hand — a walk-in, a phone call, a referral.
 *
 * Mirrors the website form's shape so a manually added lead is indistinguishable
 * from a captured one downstream, and fires the same alerts.
 */
export async function createLead(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("leads", "write");

  const name = str(form, "name");
  const email = str(form, "email").toLowerCase();
  const phone = str(form, "phone");

  if (!name) return { error: "The lead's name is required." };
  if (!email && !phone) return { error: "Add an email address or a phone number so the lead can be followed up." };
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) return { error: "That email address does not look right." };

  let leadId: string;
  try {
    const created = await prisma.enquiry.create({
      data: {
        name,
        email,
        phone,
        company: str(form, "company"),
        serviceInterest: str(form, "serviceInterest"),
        budget: str(form, "budget"),
        message: str(form, "message") || "Added from the admin panel.",
        source: str(form, "source") || "manual",
        status: (str(form, "status") || "NEW") as never,
        ownerId: nullable(form, "ownerId"),
        score: Math.max(0, Math.min(100, int(form, "score"))),
        nextFollowUpAt: date(form, "nextFollowUpAt"),
        // Someone in the team typed it, so it has already been seen.
        isRead: true,
      },
    });
    leadId = created.id;
  } catch (error) {
    console.error("[crm] createLead", error);
    return { error: "Could not save this lead." };
  }

  await alertNewLead(leadId);
  await logActivity(session.id, "create", "Lead", leadId, name);
  revalidatePath("/admin/leads");
  redirect(`/admin/leads/${leadId}`);
}

export async function updateLead(id: string, form: FormData): Promise<void> {
  await requirePermission("leads", "write");

  await prisma.enquiry.update({
    where: { id },
    data: {
      status: (str(form, "status") || "NEW") as never,
      ownerId: nullable(form, "ownerId"),
      score: Math.max(0, Math.min(100, int(form, "score"))),
      nextFollowUpAt: date(form, "nextFollowUpAt"),
      lostReason: str(form, "lostReason") || null,
      isRead: true,
    },
  });

  revalidatePath("/admin/leads");
  revalidatePath(`/admin/leads/${id}`);
}

export async function addLeadActivity(id: string, form: FormData): Promise<void> {
  const session = await requirePermission("leads", "write");
  const body = str(form, "body");
  if (!body) return;

  await prisma.enquiryNote.create({
    data: {
      enquiryId: id,
      authorId: session.id,
      type: (str(form, "type") || "NOTE") as never,
      body,
      dueAt: date(form, "dueAt"),
    },
  });

  // Logging a follow-up also moves the lead's next-contact date.
  const dueAt = date(form, "dueAt");
  if (dueAt) await prisma.enquiry.update({ where: { id }, data: { nextFollowUpAt: dueAt } });

  revalidatePath(`/admin/leads/${id}`);
}

/** Turns a qualified lead into a client record without re-typing anything. */
export async function convertLeadToClient(id: string): Promise<void> {
  const session = await requirePermission("clients", "write");

  const lead = await prisma.enquiry.findUnique({ where: { id } });
  if (!lead) return;
  if (lead.clientId) redirect(`/admin/clients/${lead.clientId}`);

  const client = await prisma.client.create({
    data: {
      code: await nextCode("client"),
      name: lead.company || lead.name,
      status: "ACTIVE",
      ownerId: lead.ownerId ?? session.id,
      notes: lead.message,
      contacts: {
        create: {
          name: lead.name,
          email: lead.email,
          phone: lead.phone,
          whatsapp: lead.phone,
          isPrimary: true,
        },
      },
    },
  });

  await prisma.enquiry.update({
    where: { id },
    data: { clientId: client.id, status: "WON", convertedAt: new Date() },
  });

  await logActivity(session.id, "convert", "Lead", id, `${lead.name} → ${client.name}`);
  revalidatePath("/admin/leads");
  revalidatePath("/admin/clients");
  redirect(`/admin/clients/${client.id}`);
}

// ------------------------------------------------------------------ quotations

type LineItem = {
  serviceId?: string;
  title: string;
  description?: string;
  quantity: string;
  unitPrice: string;
  billingCycle?: string;
};

/** Totals are computed server-side so a tampered form can't change the price. */
function priceQuotation(items: LineItem[], discountPct: number, taxPct: number) {
  const priced = items
    .filter((i) => i.title?.trim())
    .map((i, index) => {
      const quantity = Math.max(1, Number(i.quantity) || 1);
      const unitPrice = Math.max(0, Math.round(Number(i.unitPrice) || 0));
      return {
        serviceId: i.serviceId || null,
        title: i.title.trim(),
        description: i.description?.trim() || null,
        quantity,
        unitPrice,
        amount: quantity * unitPrice,
        billingCycle: toBillingCycle(i.billingCycle),
        order: index,
      };
    });

  const subtotal = priced.reduce((sum, i) => sum + i.amount, 0);
  const afterDiscount = Math.round(subtotal * (1 - discountPct / 100));
  const total = Math.round(afterDiscount * (1 + taxPct / 100));

  return { priced, subtotal, total };
}

export async function saveQuotation(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("quotations", "write");
  const id = str(form, "id");
  const clientId = str(form, "clientId");
  const title = str(form, "title");

  if (!clientId) return { error: "Pick a client for this quotation." };
  if (!title) return { error: "Give the quotation a title." };

  let items: LineItem[] = [];
  try {
    const parsed: unknown = JSON.parse(str(form, "items") || "[]");
    if (Array.isArray(parsed)) items = parsed as LineItem[];
  } catch {
    return { error: "Could not read the line items." };
  }
  if (!items.some((i) => i.title?.trim())) return { error: "Add at least one line item." };

  const discountPct = Math.max(0, Math.min(100, int(form, "discountPct")));
  const taxPct = Math.max(0, Math.min(100, int(form, "taxPct", 18)));
  const { priced, subtotal, total } = priceQuotation(items, discountPct, taxPct);

  const status = (str(form, "status") || "DRAFT") as never;
  const data = {
    title,
    clientId,
    leadId: nullable(form, "leadId"),
    status,
    commercial: (str(form, "commercial") || "ONE_TIME") as never,
    validUntil: date(form, "validUntil"),
    discountPct,
    taxPct,
    subtotal,
    total,
    terms: str(form, "terms") || null,
    notes: str(form, "notes") || null,
    ownerId: nullable(form, "ownerId") ?? session.id,
    sentAt: str(form, "status") === "SENT" ? new Date() : undefined,
  };

  let quotationId = id;
  try {
    if (id) {
      await prisma.quotation.update({ where: { id }, data });
      await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
    } else {
      const created = await prisma.quotation.create({
        data: { ...data, number: await nextCode("quotation") },
      });
      quotationId = created.id;
    }
    await prisma.quotationItem.createMany({
      data: priced.map((i) => ({ ...i, quotationId })),
    });
  } catch (error) {
    console.error("[crm] saveQuotation", error);
    return { error: "Could not save this quotation." };
  }

  await logActivity(session.id, id ? "update" : "create", "Quotation", quotationId, title);
  revalidatePath("/admin/quotations");
  revalidatePath(`/admin/quotations/${quotationId}`);
  revalidatePath(`/admin/print/quotation/${quotationId}`);
  redirect(`/admin/quotations/${quotationId}`);
}

export async function setQuotationStatus(id: string, form: FormData): Promise<void> {
  const session = await requirePermission("quotations", "write");
  const status = str(form, "status");

  await prisma.quotation.update({
    where: { id },
    data: {
      status: status as never,
      sentAt: status === "SENT" ? new Date() : undefined,
      decidedAt: status === "ACCEPTED" || status === "REJECTED" ? new Date() : undefined,
    },
  });

  await logActivity(session.id, "update", "Quotation", id, `status → ${status}`);
  revalidatePath(`/admin/quotations/${id}`);
  revalidatePath(`/admin/print/quotation/${id}`);
  revalidatePath("/admin/quotations");
}

export async function deleteQuotation(id: string) {
  const session = await requirePermission("quotations", "write");

  const linked = await prisma.clientProject.count({ where: { quotationId: id } });
  if (linked) return { error: "A project was created from this quotation, so it cannot be deleted." };

  await prisma.quotationItem.deleteMany({ where: { quotationId: id } });
  await prisma.quotation.delete({ where: { id } });

  await logActivity(session.id, "delete", "Quotation", id);
  revalidatePath("/admin/quotations");
  redirect("/admin/quotations");
}

/** Accepted quotation becomes a project, carrying client, budget and service across. */
export async function convertQuotationToProject(id: string): Promise<void> {
  const session = await requirePermission("projects", "write");

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: { items: { orderBy: { order: "asc" } } },
  });
  if (!quotation) return;

  const existing = await prisma.clientProject.findFirst({ where: { quotationId: id } });
  if (existing) redirect(`/admin/client-projects/${existing.id}`);

  const project = await prisma.clientProject.create({
    data: {
      code: await nextCode("project"),
      name: quotation.title,
      clientId: quotation.clientId,
      quotationId: quotation.id,
      serviceId: quotation.items.find((i) => i.serviceId)?.serviceId ?? null,
      managerId: session.id,
      stage: "PLANNED",
      commercial: quotation.commercial,
      budget: quotation.total,
      // The accepted line items become the initial scope baseline.
      inclusions: quotation.items.map((i) => `• ${i.title}`).join("\n"),
      objectives: quotation.notes,
    },
  });

  await prisma.quotation.update({
    where: { id },
    data: { status: "ACCEPTED", decidedAt: new Date() },
  });

  await logActivity(session.id, "convert", "Quotation", id, `${quotation.number} → ${project.code}`);
  revalidatePath("/admin/quotations");
  revalidatePath("/admin/client-projects");
  redirect(`/admin/client-projects/${project.id}`);
}

// ------------------------------------------------------------------ projects

export async function saveProjectRecord(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("projects", "write");
  const id = str(form, "id");
  const name = str(form, "name");
  const clientId = str(form, "clientId");

  if (!clientId) return { error: "Pick the client this project belongs to." };
  if (!name) return { error: "Give the project a name." };

  const data = {
    name,
    clientId,
    serviceId: nullable(form, "serviceId"),
    managerId: nullable(form, "managerId") ?? session.id,
    stage: (str(form, "stage") || "PLANNED") as never,
    health: (str(form, "health") || "ON_TRACK") as never,
    commercial: (str(form, "commercial") || "ONE_TIME") as never,
    budget: int(form, "budget"),
    startDate: date(form, "startDate"),
    endDate: date(form, "endDate"),
    objectives: str(form, "objectives") || null,
    inclusions: str(form, "inclusions") || null,
    exclusions: str(form, "exclusions") || null,
    assumptions: str(form, "assumptions") || null,
    acceptanceCriteria: str(form, "acceptanceCriteria") || null,
  };

  let projectId = id;
  try {
    if (id) {
      // Editing the scope bumps the baseline version so the original stays auditable.
      const before = await prisma.clientProject.findUnique({
        where: { id },
        select: { inclusions: true, exclusions: true, acceptanceCriteria: true, scopeVersion: true },
      });
      const scopeChanged =
        before &&
        (before.inclusions !== data.inclusions ||
          before.exclusions !== data.exclusions ||
          before.acceptanceCriteria !== data.acceptanceCriteria);

      await prisma.clientProject.update({
        where: { id },
        data: { ...data, ...(scopeChanged ? { scopeVersion: before.scopeVersion + 1 } : {}) },
      });
    } else {
      const created = await prisma.clientProject.create({
        data: { ...data, code: await nextCode("project") },
      });
      projectId = created.id;
    }
  } catch (error) {
    console.error("[crm] saveProjectRecord", error);
    return { error: "Could not save this project." };
  }

  await logActivity(session.id, id ? "update" : "create", "ClientProject", projectId, name);
  revalidatePath("/admin/client-projects");
  redirect(`/admin/client-projects/${projectId}`);
}

export async function deleteProjectRecord(id: string) {
  const session = await requirePermission("projects", "write");

  await prisma.taskComment.deleteMany({ where: { task: { projectId: id } } });
  await prisma.task.deleteMany({ where: { projectId: id } });
  await prisma.milestone.deleteMany({ where: { projectId: id } });
  await prisma.projectMember.deleteMany({ where: { projectId: id } });
  await prisma.changeRequest.deleteMany({ where: { projectId: id } });
  await prisma.clientProject.delete({ where: { id } });

  await logActivity(session.id, "delete", "ClientProject", id);
  revalidatePath("/admin/client-projects");
  redirect("/admin/client-projects");
}

export async function saveMilestone(projectId: string, form: FormData): Promise<void> {
  await requirePermission("projects", "write");
  const id = str(form, "milestoneId");
  const title = str(form, "title");
  if (!title) return;

  const status = (str(form, "status") || "PENDING") as never;
  const data = {
    projectId,
    title,
    description: str(form, "description") || null,
    status,
    startDate: date(form, "startDate"),
    dueDate: date(form, "dueDate"),
    ownerId: nullable(form, "ownerId"),
    order: int(form, "order"),
    completedAt: str(form, "status") === "COMPLETED" ? new Date() : null,
  };

  if (id) await prisma.milestone.update({ where: { id }, data });
  else await prisma.milestone.create({ data });

  revalidatePath(`/admin/client-projects/${projectId}`);
}

export async function deleteMilestone(projectId: string, id: string): Promise<void> {
  await requirePermission("projects", "write");
  await prisma.task.updateMany({ where: { milestoneId: id }, data: { milestoneId: null } });
  await prisma.milestone.delete({ where: { id } });
  revalidatePath(`/admin/client-projects/${projectId}`);
}

export async function saveChangeRequest(projectId: string, form: FormData): Promise<void> {
  const session = await requirePermission("projects", "write");
  const title = str(form, "title");
  const description = str(form, "description");
  if (!title || !description) return;

  await prisma.changeRequest.create({
    data: {
      projectId,
      title,
      description,
      costImpact: int(form, "costImpact"),
      timeImpactDays: int(form, "timeImpactDays"),
      scopeImpact: str(form, "scopeImpact") || null,
      requestedById: session.id,
    },
  });

  revalidatePath(`/admin/client-projects/${projectId}`);
}

export async function decideChangeRequest(projectId: string, id: string, form: FormData): Promise<void> {
  const session = await requirePermission("projects", "write");
  const status = str(form, "status");

  await prisma.changeRequest.update({
    where: { id },
    data: { status: status as never, decidedById: session.id, decidedAt: new Date() },
  });

  // An approved change updates the commercials and the scope baseline.
  if (status === "APPROVED") {
    const cr = await prisma.changeRequest.findUnique({ where: { id } });
    const project = await prisma.clientProject.findUnique({ where: { id: projectId } });
    if (cr && project) {
      await prisma.clientProject.update({
        where: { id: projectId },
        data: {
          budget: project.budget + cr.costImpact,
          scopeVersion: project.scopeVersion + 1,
          endDate:
            project.endDate && cr.timeImpactDays
              ? new Date(project.endDate.getTime() + cr.timeImpactDays * 86_400_000)
              : project.endDate,
        },
      });
    }
  }

  revalidatePath(`/admin/client-projects/${projectId}`);
}

// ------------------------------------------------------------------ tasks

export async function saveTask(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("tasks", "write");
  const id = str(form, "id");
  const title = str(form, "title");
  const projectId = str(form, "projectId");

  if (!projectId) return { error: "Pick the project this task belongs to." };
  if (!title) return { error: "Give the task a title." };

  const status = (str(form, "status") || "TODO") as never;
  const data = {
    projectId,
    milestoneId: nullable(form, "milestoneId"),
    title,
    description: str(form, "description") || null,
    status,
    priority: (str(form, "priority") || "MEDIUM") as never,
    assigneeId: nullable(form, "assigneeId"),
    dueDate: date(form, "dueDate"),
    estimateHours: int(form, "estimateHours"),
    completedAt: str(form, "status") === "DONE" ? new Date() : null,
    ...(id ? {} : { reporterId: session.id }),
  };

  try {
    if (id) await prisma.task.update({ where: { id }, data });
    else await prisma.task.create({ data });
  } catch (error) {
    console.error("[crm] saveTask", error);
    return { error: "Could not save this task." };
  }

  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/client-projects/${projectId}`);
  return { ok: true, message: "Task saved." };
}

/** Used by the board to move a card between columns. */
export async function setTaskStatus(id: string, status: string): Promise<void> {
  const session = await requirePermission("tasks", "write");

  const task = await prisma.task.findUnique({ where: { id }, select: { assigneeId: true, projectId: true } });
  if (!task) return;

  // Team members may only move their own cards.
  if (session.role === "TEAM_MEMBER" && task.assigneeId !== session.id) return;

  await prisma.task.update({
    where: { id },
    data: { status: status as never, completedAt: status === "DONE" ? new Date() : null },
  });

  revalidatePath("/admin/tasks");
  revalidatePath(`/admin/client-projects/${task.projectId}`);
}

export async function deleteTask(id: string): Promise<void> {
  await requirePermission("tasks", "write");
  const task = await prisma.task.findUnique({ where: { id }, select: { projectId: true } });
  await prisma.taskComment.deleteMany({ where: { taskId: id } });
  await prisma.task.deleteMany({ where: { parentId: id } });
  await prisma.task.delete({ where: { id } });
  revalidatePath("/admin/tasks");
  if (task) revalidatePath(`/admin/client-projects/${task.projectId}`);
}

export async function addTaskComment(taskId: string, form: FormData): Promise<void> {
  const session = await requirePermission("tasks", "write");
  const body = str(form, "body");
  if (!body) return;

  await prisma.taskComment.create({ data: { taskId, authorId: session.id, body } });
  revalidatePath("/admin/tasks");
}
