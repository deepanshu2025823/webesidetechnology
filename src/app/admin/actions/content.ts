"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";
import type { ContentStatus, EnquiryStatus } from "@/generated/prisma/enums";
import { hashPassword, logActivity, requirePermission, requireSession } from "@/lib/auth";
import { excerptFrom, readingMinutes, slugify } from "@/lib/utils";
import type { ActionState } from "@/app/admin/actions/collections";

export type { ActionState };

const str = (form: FormData, key: string) => String(form.get(key) ?? "").trim();
const bool = (form: FormData, key: string) => form.get(key) === "on" || form.get(key) === "true";
const num = (form: FormData, key: string) => {
  const raw = str(form, key);
  if (!raw) return null;
  const n = Number(raw);
  return Number.isFinite(n) ? n : null;
};

/** JSON columns arrive as a serialised string from the Repeater/TagList inputs. */
function json(form: FormData, key: string): Prisma.InputJsonValue {
  const raw = str(form, key);
  if (!raw) return [];
  try {
    const parsed: unknown = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as Prisma.InputJsonValue) : [];
  } catch {
    return [];
  }
}

/** Form selects hand back plain strings; narrow them to the schema enum. */
function status(form: FormData, fallback: ContentStatus): ContentStatus {
  const value = str(form, "status");
  return value === "PUBLISHED" || value === "DRAFT" || value === "ARCHIVED" ? value : fallback;
}

/** Accepts "facebook.com/acme" and stores "https://facebook.com/acme". */
function normalizeUrl(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  if (/^(https?:\/\/|mailto:|tel:|\/)/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

function seoFields(form: FormData) {
  return {
    metaTitle: str(form, "metaTitle"),
    metaDescription: str(form, "metaDescription"),
    metaKeywords: str(form, "metaKeywords"),
  };
}

/**
 * Refresh the public site after an edit.
 *
 * Scoped to the `(site)` route group on purpose: revalidating the root layout
 * would also invalidate the admin tree, remounting the form the editor just
 * submitted and throwing away its success message.
 */
function refresh(...paths: string[]) {
  revalidatePath("/(site)", "layout");
  revalidatePath("/sitemap.xml");
  for (const p of paths) revalidatePath(p);
}

// ------------------------------------------------------------------ services

export async function saveService(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = str(form, "id");
  const title = str(form, "title");
  if (!title) return { error: "Title is required." };

  const data = {
    title,
    slug: slugify(str(form, "slug") || title),
    categoryId: str(form, "categoryId") || null,
    shortDescription: str(form, "shortDescription"),
    icon: str(form, "icon") || "Sparkles",
    coverImage: str(form, "coverImage") || null,
    heroTitle: str(form, "heroTitle"),
    heroSubtitle: str(form, "heroSubtitle"),
    content: str(form, "content"),
    features: json(form, "features"),
    processSteps: json(form, "processSteps"),
    deliverables: json(form, "deliverables"),
    priceFrom: num(form, "priceFrom"),
    priceUnit: str(form, "priceUnit") || "project",
    isFeatured: bool(form, "isFeatured"),
    status: status(form, "PUBLISHED"),
    order: num(form, "order") ?? 0,
    ...seoFields(form),
  };

  try {
    if (id) await prisma.service.update({ where: { id }, data });
    else await prisma.service.create({ data });
  } catch (error) {
    console.error("[admin] saveService", error);
    return { error: "Could not save. The URL slug may already be in use." };
  }

  await logActivity(session.id, id ? "update" : "create", "Service", id || undefined, title);
  refresh("/services", `/services/${data.slug}`, "/admin/services");
  redirect("/admin/services?saved=1");
}

export async function deleteService(id: string) {
  const session = await requireSession();
  await prisma.projectService.deleteMany({ where: { serviceId: id } });
  await prisma.faq.updateMany({ where: { serviceId: id }, data: { serviceId: null } });
  await prisma.service.delete({ where: { id } });
  await logActivity(session.id, "delete", "Service", id);
  refresh("/services", "/admin/services");
}

// ------------------------------------------------------------------ projects

export async function saveProject(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = str(form, "id");
  const title = str(form, "title");
  if (!title) return { error: "Title is required." };

  const completed = str(form, "completedAt");
  const data = {
    title,
    slug: slugify(str(form, "slug") || title),
    clientName: str(form, "clientName"),
    industry: str(form, "industry"),
    summary: str(form, "summary"),
    challenge: str(form, "challenge"),
    solution: str(form, "solution"),
    results: json(form, "results"),
    gallery: json(form, "gallery"),
    technologies: json(form, "technologies"),
    coverImage: str(form, "coverImage") || null,
    websiteUrl: str(form, "websiteUrl"),
    completedAt: completed ? new Date(completed) : null,
    isFeatured: bool(form, "isFeatured"),
    status: status(form, "PUBLISHED"),
    order: num(form, "order") ?? 0,
    ...seoFields(form),
  };

  const serviceIds = form.getAll("serviceIds").map(String).filter(Boolean);

  try {
    const project = id
      ? await prisma.project.update({ where: { id }, data })
      : await prisma.project.create({ data });

    await prisma.projectService.deleteMany({ where: { projectId: project.id } });
    if (serviceIds.length) {
      await prisma.projectService.createMany({
        data: serviceIds.map((serviceId) => ({ projectId: project.id, serviceId })),
      });
    }
  } catch (error) {
    console.error("[admin] saveProject", error);
    return { error: "Could not save. The URL slug may already be in use." };
  }

  await logActivity(session.id, id ? "update" : "create", "Project", id || undefined, title);
  refresh("/portfolio", `/portfolio/${data.slug}`, "/admin/projects");
  redirect("/admin/projects?saved=1");
}

export async function deleteProject(id: string) {
  const session = await requireSession();
  await prisma.projectService.deleteMany({ where: { projectId: id } });
  await prisma.testimonial.updateMany({ where: { projectId: id }, data: { projectId: null } });
  await prisma.project.delete({ where: { id } });
  await logActivity(session.id, "delete", "Project", id);
  refresh("/portfolio", "/admin/projects");
}

// ------------------------------------------------------------------ posts

export async function savePost(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = str(form, "id");
  const title = str(form, "title");
  if (!title) return { error: "Title is required." };

  const content = str(form, "content");
  const postStatus = status(form, "DRAFT");
  const publishedRaw = str(form, "publishedAt");

  const data = {
    title,
    slug: slugify(str(form, "slug") || title),
    excerpt: str(form, "excerpt") || excerptFrom(content, 180),
    content,
    coverImage: str(form, "coverImage") || null,
    categoryId: str(form, "categoryId") || null,
    authorId: str(form, "authorId") || session.id,
    status: postStatus,
    isFeatured: bool(form, "isFeatured"),
    readingMinutes: readingMinutes(content),
    publishedAt: publishedRaw
      ? new Date(publishedRaw)
      : postStatus === "PUBLISHED"
        ? new Date()
        : null,
    ...seoFields(form),
  };

  const tagNames = (json(form, "tags") as unknown as string[]).filter(Boolean);

  try {
    const post = id ? await prisma.post.update({ where: { id }, data }) : await prisma.post.create({ data });

    await prisma.postTag.deleteMany({ where: { postId: post.id } });
    for (const name of tagNames) {
      const slug = slugify(name);
      if (!slug) continue;
      const tag = await prisma.tag.upsert({ where: { slug }, create: { name, slug }, update: { name } });
      await prisma.postTag.create({ data: { postId: post.id, tagId: tag.id } });
    }
  } catch (error) {
    console.error("[admin] savePost", error);
    return { error: "Could not save. The URL slug may already be in use." };
  }

  await logActivity(session.id, id ? "update" : "create", "Post", id || undefined, title);
  refresh("/blog", `/blog/${data.slug}`, "/admin/posts");
  redirect("/admin/posts?saved=1");
}

export async function deletePost(id: string) {
  const session = await requireSession();
  await prisma.postTag.deleteMany({ where: { postId: id } });
  await prisma.post.delete({ where: { id } });
  await logActivity(session.id, "delete", "Post", id);
  refresh("/blog", "/admin/posts");
}

// ------------------------------------------------------------------ pages

export async function savePage(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requireSession();
  const id = str(form, "id");
  const title = str(form, "title");
  if (!title) return { error: "Title is required." };

  const data = {
    title,
    slug: slugify(str(form, "slug") || title),
    heroTitle: str(form, "heroTitle"),
    heroSubtitle: str(form, "heroSubtitle"),
    heroImage: str(form, "heroImage") || null,
    content: str(form, "content"),
    status: status(form, "PUBLISHED"),
    showInSitemap: bool(form, "showInSitemap"),
    ...seoFields(form),
  };

  try {
    if (id) await prisma.page.update({ where: { id }, data });
    else await prisma.page.create({ data });
  } catch (error) {
    console.error("[admin] savePage", error);
    return { error: "Could not save. The URL slug may already be in use." };
  }

  await logActivity(session.id, id ? "update" : "create", "Page", id || undefined, title);
  refresh(`/${data.slug}`, "/admin/pages");
  redirect("/admin/pages?saved=1");
}

export async function deletePage(id: string) {
  const session = await requireSession();
  const page = await prisma.page.findUnique({ where: { id } });
  if (page?.isSystem) return;
  await prisma.page.delete({ where: { id } });
  await logActivity(session.id, "delete", "Page", id);
  refresh("/admin/pages");
}

// ------------------------------------------------------------------ settings

export async function saveSettings(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("settings", "write");

  const textKeys = [
    "siteName", "tagline", "description", "logoLight", "logoDark", "logoMark", "ogImage",
    "email", "altEmail", "phone", "altPhone", "whatsapp", "addressLine", "city", "state",
    "postalCode", "country", "mapEmbedUrl", "workingHours",
    "gstin", "pan", "bankAccountName", "bankName", "bankAccountNumber", "bankIfsc",
    "bankBranch", "upiId", "upiQr", "paymentNote", "facebook", "instagram",
    "linkedin", "twitter", "youtube", "footerAbout", "ctaTitle", "ctaSubtitle", "ctaButton",
    "ctaUrl", "videoTitle", "videoSubtitle", "metaTitle", "metaDescription", "metaKeywords", "gaMeasurementId",
    "gtmContainerId", "searchConsoleId", "schemaOrgType", "foundingYear",
  ] as const;

  const linkKeys = new Set(["facebook", "instagram", "linkedin", "twitter", "youtube"]);

  const data: Record<string, string | boolean | number> = {
    robotsIndexable: bool(form, "robotsIndexable"),
    videoEnabled: bool(form, "videoEnabled"),
    // Clamped because the grid classes only exist for 1-6 across.
    videoPerRow: Math.max(1, Math.min(6, Number(str(form, "videoPerRow")) || 3)),
  };
  for (const key of textKeys) {
    const raw = str(form, key);
    data[key] = linkKeys.has(key) ? normalizeUrl(raw) : raw;
  }

  try {
    await prisma.siteSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...data } as Prisma.SiteSettingsUncheckedCreateInput,
      update: data,
    });
  } catch (error) {
    console.error("[admin] saveSettings", error);
    return { error: "Could not save settings." };
  }

  await logActivity(session.id, "update", "SiteSettings", "1", "Site settings updated");
  refresh("/", "/sitemap.xml", "/robots.txt");
  // Bank, UPI and GST details are read straight off this row by every printed
  // quotation and invoice, so those have to be rebuilt too.
  revalidatePath("/admin", "layout");
  return { ok: true, message: "Settings saved. The live site has been refreshed." };
}

// ------------------------------------------------------------------ enquiries

export async function updateEnquiry(id: string, form: FormData): Promise<void> {
  await requireSession();
  await prisma.enquiry.update({
    where: { id },
    data: { status: str(form, "status") as EnquiryStatus, isRead: true },
  });
  revalidatePath("/admin/enquiries");
  revalidatePath(`/admin/enquiries/${id}`);
}

export async function addEnquiryNote(id: string, form: FormData): Promise<void> {
  const session = await requireSession();
  const body = str(form, "body");
  if (!body) return;

  await prisma.enquiryNote.create({ data: { enquiryId: id, authorId: session.id, body } });
  revalidatePath(`/admin/enquiries/${id}`);
}

export async function deleteEnquiry(id: string) {
  const session = await requireSession();
  await prisma.enquiryNote.deleteMany({ where: { enquiryId: id } });
  await prisma.enquiry.delete({ where: { id } });
  await logActivity(session.id, "delete", "Enquiry", id);
  revalidatePath("/admin/leads");
  redirect("/admin/leads");
}

// ------------------------------------------------------------------ users

const userSchema = z.object({
  name: z.string().trim().min(2, "Name is required"),
  email: z.email("Enter a valid email"),
  role: z.enum([
    "SUPER_ADMIN", "DIRECTOR", "SALES", "PROJECT_MANAGER", "TEAM_LEAD",
    "TEAM_MEMBER", "FINANCE", "HR", "PARTNER_MANAGER", "EDITOR",
  ]),
});

export async function saveUser(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("users", "write");
  const id = str(form, "id");

  const parsed = userSchema.safeParse({
    name: str(form, "name"),
    email: str(form, "email"),
    role: str(form, "role"),
  });
  if (!parsed.success) return { error: parsed.error.issues[0]?.message ?? "Check the details" };

  const password = str(form, "password");
  if (!id && password.length < 8) return { error: "Set a password of at least 8 characters." };
  if (password && password.length < 8) return { error: "Password must be at least 8 characters." };

  const data: Record<string, unknown> = {
    name: parsed.data.name,
    email: parsed.data.email.toLowerCase(),
    role: parsed.data.role,
    isActive: bool(form, "isActive"),
  };
  if (password) data.passwordHash = await hashPassword(password);

  try {
    if (id) await prisma.user.update({ where: { id }, data });
    else await prisma.user.create({ data: data as never });
  } catch (error) {
    console.error("[admin] saveUser", error);
    return { error: "Could not save. That email may already be registered." };
  }

  await logActivity(session.id, id ? "update" : "create", "User", id || undefined, parsed.data.email);
  revalidatePath("/admin/users");
  return { ok: true, message: "User saved." };
}

export async function deleteUser(id: string) {
  const session = await requirePermission("users", "write");
  if (session.id === id) return;
  await prisma.user.delete({ where: { id } });
  await logActivity(session.id, "delete", "User", id);
  revalidatePath("/admin/users");
}
