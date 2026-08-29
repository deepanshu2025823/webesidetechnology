"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity, requirePermission } from "@/lib/auth";
import type { ActionState } from "@/app/admin/actions/collections";

export type { ActionState };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const nullable = (f: FormData, k: string) => str(f, k) || null;

/**
 * Registers an already-uploaded file. Uploading a file with the same name for
 * the same client supersedes the old one and keeps it as a version, which is
 * what scope section 20 asks for.
 */
export async function saveDocument(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("documents", "write");
  const name = str(form, "name");
  const url = str(form, "url");
  if (!name) return { error: "Give the document a name." };
  if (!url) return { error: "Upload a file first." };

  const clientId = nullable(form, "clientId");

  const previous = await prisma.document.findFirst({
    where: { name, clientId, replacesId: null },
    orderBy: { version: "desc" },
  });

  const created = await prisma.document.create({
    data: {
      name,
      url,
      mimeType: str(form, "mimeType"),
      size: Number(str(form, "size")) || 0,
      category: str(form, "category") || "General",
      clientId,
      projectId: nullable(form, "projectId"),
      serviceId: nullable(form, "serviceId"),
      isClientVisible: form.get("isClientVisible") === "on",
      uploadedById: session.id,
      version: previous ? previous.version + 1 : 1,
    },
  });

  // Point the old row at the new one so history stays walkable.
  if (previous) {
    await prisma.document.update({ where: { id: previous.id }, data: { replacesId: created.id } });
  }

  await logActivity(session.id, "create", "Document", created.id, name);
  revalidatePath("/admin/documents");
  return { ok: true, message: previous ? `Saved as version ${created.version}.` : "Document saved." };
}

export async function deleteDocument(id: string): Promise<void> {
  const session = await requirePermission("documents", "write");
  await prisma.document.updateMany({ where: { replacesId: id }, data: { replacesId: null } });
  await prisma.document.delete({ where: { id } });
  await logActivity(session.id, "delete", "Document", id);
  revalidatePath("/admin/documents");
}

export async function toggleDocumentVisibility(id: string, visible: boolean): Promise<void> {
  const session = await requirePermission("documents", "write");
  await prisma.document.update({ where: { id }, data: { isClientVisible: visible } });
  await logActivity(session.id, "update", "Document", id, visible ? "shared with client" : "hidden from client");
  revalidatePath("/admin/documents");
}
