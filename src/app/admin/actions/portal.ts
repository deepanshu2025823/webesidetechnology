"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { hashPassword, logActivity, requirePermission } from "@/lib/auth";
import { authenticatePortalUser, createPortalSession, destroyPortalSession, requirePortalSession } from "@/lib/portal-auth";
import { managementUserIds, notify } from "@/lib/notify";
import type { ActionState } from "@/app/admin/actions/collections";

export type { ActionState };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const nullable = (f: FormData, k: string) => str(f, k) || null;

// ------------------------------------------------------------------ admin side

export async function savePortalUser(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("portal", "write");
  const id = str(form, "id");
  const name = str(form, "name");
  const email = str(form, "email").toLowerCase();
  const clientId = str(form, "clientId");
  const password = str(form, "password");

  if (!clientId) return { error: "Pick the client this login belongs to." };
  if (!name || !email) return { error: "Name and email are required." };
  if (!id && password.length < 8) return { error: "Set a password of at least 8 characters." };
  if (password && password.length < 8) return { error: "Password must be at least 8 characters." };

  const data: Record<string, unknown> = {
    name,
    email,
    clientId,
    isActive: form.get("isActive") !== null,
  };
  if (password) data.passwordHash = await hashPassword(password);

  try {
    if (id) await prisma.clientPortalUser.update({ where: { id }, data });
    else await prisma.clientPortalUser.create({ data: data as never });
  } catch (error) {
    console.error("[portal] savePortalUser", error);
    return { error: "Could not save. That email may already have a login." };
  }

  await logActivity(session.id, id ? "update" : "create", "ClientPortalUser", id || undefined, email);
  revalidatePath("/admin/portal");
  return { ok: true, message: "Portal login saved." };
}

export async function deletePortalUser(id: string): Promise<void> {
  const session = await requirePermission("portal", "write");
  await prisma.clientPortalUser.delete({ where: { id } });
  await logActivity(session.id, "delete", "ClientPortalUser", id);
  revalidatePath("/admin/portal");
}

/** Raises a sign-off request the client sees in their portal. */
export async function requestApproval(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("portal", "write");
  const clientId = str(form, "clientId");
  const title = str(form, "title");
  if (!clientId || !title) return { error: "Pick a client and describe what needs approving." };

  await prisma.approval.create({
    data: {
      clientId,
      projectId: nullable(form, "projectId"),
      entity: str(form, "entity") || "General",
      entityId: str(form, "entityId"),
      title,
      description: str(form, "description") || null,
      dueAt: str(form, "dueAt") ? new Date(str(form, "dueAt")) : null,
      requestedById: session.id,
    },
  });

  await logActivity(session.id, "create", "Approval", clientId, title);
  revalidatePath("/admin/portal");
  return { ok: true, message: "Approval requested." };
}

export async function assignTicket(id: string, form: FormData): Promise<void> {
  const session = await requirePermission("portal", "write");
  const status = str(form, "status");

  await prisma.ticket.update({
    where: { id },
    data: {
      status: status as never,
      assigneeId: nullable(form, "assigneeId"),
      resolvedAt: status === "RESOLVED" || status === "CLOSED" ? new Date() : null,
    },
  });

  await logActivity(session.id, "update", "Ticket", id, status);
  revalidatePath("/admin/portal");
}

// ------------------------------------------------------------------ client side

const loginSchema = z.object({
  email: z.email("Enter a valid email"),
  password: z.string().min(1, "Enter your password"),
});

export type PortalLoginState = { error?: string };

export async function portalLogin(_prev: PortalLoginState, form: FormData): Promise<PortalLoginState> {
  const parsed = loginSchema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check your details" };

  const user = await authenticatePortalUser(parsed.data.email, parsed.data.password);
  if (!user) return { error: "Those credentials do not match an active login." };

  await createPortalSession(user);
  redirect("/portal");
}

export async function portalLogout() {
  await destroyPortalSession();
  redirect("/portal/login");
}

export async function decideApproval(id: string, form: FormData): Promise<void> {
  const session = await requirePortalSession();
  const status = str(form, "status");
  const comment = str(form, "comment");

  const approval = await prisma.approval.findUnique({ where: { id }, include: { client: { select: { name: true } } } });
  if (!approval || approval.clientId !== session.clientId) return;

  await prisma.approval.update({
    where: { id },
    data: { status: status as never, decidedById: session.id, decidedAt: new Date() },
  });

  if (comment) {
    await prisma.approvalComment.create({ data: { approvalId: id, portalUserId: session.id, body: comment } });
  }

  await notify({
    userIds: [approval.requestedById, ...(await managementUserIds())].filter(Boolean) as string[],
    type: "approval_decided",
    title: `${approval.client.name} ${status.toLowerCase()} "${approval.title}"`,
    body: comment || undefined,
    url: "/admin/portal",
    entity: "Approval",
    entityId: id,
  });

  revalidatePath("/portal");
  revalidatePath("/admin/portal");
}

export async function raiseTicket(form: FormData): Promise<void> {
  const session = await requirePortalSession();
  const subject = str(form, "subject");
  const body = str(form, "body");
  if (!subject || !body) return;

  const ticket = await prisma.ticket.create({
    data: {
      clientId: session.clientId,
      portalUserId: session.id,
      subject,
      body,
      priority: (str(form, "priority") || "MEDIUM") as never,
    },
  });

  await notify({
    userIds: await managementUserIds(),
    type: "ticket_raised",
    title: `New ticket from ${session.clientName}`,
    body: subject,
    url: "/admin/portal",
    entity: "Ticket",
    entityId: ticket.id,
  });

  revalidatePath("/portal/tickets");
  revalidatePath("/admin/portal");
}
