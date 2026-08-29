"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireSession, logActivity } from "@/lib/auth";
import { getCollection, type Collection, type Field } from "@/lib/admin/collections";
import { slugify } from "@/lib/utils";

export type ActionState = { ok?: boolean; error?: string; message?: string };

/**
 * Rebuild the public pages after an edit.
 *
 * Scoped to the `(site)` route group: revalidating the root layout would also
 * invalidate the admin tree and remount the form mid-submit.
 */
function refreshSite() {
  revalidatePath("/(site)", "layout");
  revalidatePath("/sitemap.xml");
}

/** Prisma models are addressed by name here; the whitelist is the collection map. */
function model(collection: Collection) {
  const delegate = (prisma as unknown as Record<string, Record<string, (args?: unknown) => Promise<unknown>>>)[
    collection.model
  ];
  if (!delegate) throw new Error(`Unknown model ${collection.model}`);
  return delegate;
}

function coerce(field: Field, form: FormData): unknown {
  const raw = form.get(field.name);

  switch (field.type) {
    case "boolean":
      return raw === "on" || raw === "true";
    case "number": {
      if (raw === null || raw === "") return field.defaultValue ?? 0;
      const n = Number(raw);
      return Number.isFinite(n) ? n : (field.defaultValue ?? 0);
    }
    case "date":
      return raw ? new Date(String(raw)) : null;
    case "taglist": {
      // The TagListInput posts a JSON array; a Json column needs it parsed.
      if (!raw) return [];
      try {
        const parsed: unknown = JSON.parse(String(raw));
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    case "select": {
      const value = raw === null ? "" : String(raw);
      // Relation selects (parentId and friends) must be null, never "".
      if (field.name.endsWith("Id")) return value || null;
      // Numeric enums such as rating come back as strings.
      if (typeof field.defaultValue === "number") return Number(value || field.defaultValue);
      return value || String(field.defaultValue ?? "");
    }
    default:
      return raw === null ? "" : String(raw).trim();
  }
}

function buildData(collection: Collection, form: FormData) {
  const data: Record<string, unknown> = {};
  for (const field of collection.fields) {
    data[field.name] = coerce(field, form);
  }

  // Keep slugs tidy and never empty.
  if ("slug" in data) {
    const source = String(data.slug || data[collection.titleField] || "");
    data.slug = slugify(source);
  }

  return data;
}

export async function saveCollectionItem(
  slug: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireSession();
  const collection = getCollection(slug);
  if (!collection) return { error: "Unknown section" };

  const id = String(formData.get("id") ?? "");
  const data = buildData(collection, formData);

  // Required-field check mirrors the browser validation for non-JS submits.
  for (const field of collection.fields) {
    if (field.required && !String(data[field.name] ?? "").trim()) {
      return { error: `${field.label} is required.` };
    }
  }

  try {
    if (id) {
      await model(collection).update({ where: { id }, data });
    } else {
      await model(collection).create({ data });
    }
  } catch (error) {
    console.error(`[admin] save ${collection.model} failed`, error);
    const message = error instanceof Error && error.message.includes("Unique")
      ? "That slug is already used. Pick another."
      : "Could not save. Please check the fields and try again.";
    return { error: message };
  }

  await logActivity(session.id, id ? "update" : "create", collection.singular, id || undefined, String(data[collection.titleField] ?? ""));
  refreshSite();

  return { ok: true, message: `${collection.singular} saved.` };
}

export async function deleteCollectionItem(slug: string, id: string): Promise<ActionState> {
  const session = await requireSession();
  const collection = getCollection(slug);
  if (!collection) return { error: "Unknown section" };

  try {
    // A menu link may be the parent of a dropdown; promote its children to the
    // top level first, otherwise the self-relation blocks the delete.
    if (slug === "menus") {
      await prisma.menuItem.updateMany({ where: { parentId: id }, data: { parentId: null } });
    }
    await model(collection).delete({ where: { id } });
  } catch (error) {
    console.error(`[admin] delete ${collection.model} failed`, error);
    return { error: "Could not delete this item. It may still be linked to other content." };
  }

  await logActivity(session.id, "delete", collection.singular, id);
  refreshSite();

  return { ok: true, message: `${collection.singular} deleted.` };
}

export async function reorderCollection(slug: string, ids: string[]): Promise<ActionState> {
  await requireSession();
  const collection = getCollection(slug);
  if (!collection) return { error: "Unknown section" };

  await Promise.all(ids.map((id, index) => model(collection).update({ where: { id }, data: { order: index } })));

  refreshSite();
  return { ok: true };
}

export async function toggleCollectionField(slug: string, id: string, field: string, value: boolean) {
  await requireSession();
  const collection = getCollection(slug);
  if (!collection) return { error: "Unknown section" };

  await model(collection).update({ where: { id }, data: { [field]: value } });
  refreshSite();
  return { ok: true };
}
