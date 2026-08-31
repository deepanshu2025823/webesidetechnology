import "server-only";
import { cache } from "react";
import { prisma } from "@/lib/prisma";

/**
 * Read helpers for the public site. Every fetcher is wrapped in React's `cache`
 * so a single render never hits TiDB twice for the same data.
 */

export const DEFAULT_SETTINGS = {
  id: 1,
  siteName: "Sahab India",
  tagline: "Web • Apps • Marketing • Growth",
  description:
    "Sahab India is a full-service IT and digital marketing agency building websites, apps and campaigns that grow revenue.",
  logoLight: "/brand/logo.png",
  logoDark: "/brand/logo-light.png",
  logoMark: "/brand/logo-mark-light.png",
  ogImage: "/brand/og-default.png",
  email: "info@sahabindia.com",
  altEmail: "",
  phone: "",
  altPhone: "",
  whatsapp: "",
  addressLine: "",
  city: "",
  state: "",
  postalCode: "",
  country: "India",
  mapEmbedUrl: "",
  workingHours: "Mon – Sat, 10:00 – 19:00",
  facebook: "",
  instagram: "",
  linkedin: "",
  twitter: "",
  youtube: "",
  footerAbout: "",
  ctaTitle: "Ready to grow your business online?",
  ctaSubtitle: "",
  ctaButton: "Book a free consultation",
  ctaUrl: "/contact",
  videoEnabled: true,
  videoTitle: "Work in motion",
  videoSubtitle: "",
  videoPerRow: 3,
  metaTitle: "",
  metaDescription: "",
  metaKeywords: "",
  gaMeasurementId: "",
  gtmContainerId: "",
  searchConsoleId: "",
  robotsIndexable: true,
  schemaOrgType: "Organization",
  foundingYear: "",
  updatedAt: new Date(),
};

export type Settings = typeof DEFAULT_SETTINGS;

/** Site settings row, falling back to sane defaults before the first save. */
export const getSettings = cache(async (): Promise<Settings> => {
  try {
    const row = await prisma.siteSettings.findUnique({ where: { id: 1 } });
    return row ? ({ ...DEFAULT_SETTINGS, ...row } as Settings) : DEFAULT_SETTINGS;
  } catch {
    // Keeps the site renderable if the database is briefly unreachable.
    return DEFAULT_SETTINGS;
  }
});

export const getMenu = cache(async (location: "HEADER" | "FOOTER_SERVICES" | "FOOTER_COMPANY" | "LEGAL") =>
  prisma.menuItem.findMany({
    where: { location, isActive: true, parentId: null },
    orderBy: { order: "asc" },
    include: {
      children: { where: { isActive: true }, orderBy: { order: "asc" } },
    },
  }),
);

export const getServiceCategories = cache(async () =>
  prisma.serviceCategory.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    include: {
      services: {
        where: { status: "PUBLISHED" },
        orderBy: { order: "asc" },
      },
    },
  }),
);

export const getServices = cache(async (opts?: { featuredOnly?: boolean; take?: number }) =>
  prisma.service.findMany({
    where: { status: "PUBLISHED", ...(opts?.featuredOnly ? { isFeatured: true } : {}) },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    take: opts?.take,
    include: { category: true },
  }),
);

export const getServiceBySlug = cache(async (slug: string) =>
  prisma.service.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      category: true,
      faqs: { where: { isActive: true }, orderBy: { order: "asc" } },
      projects: { include: { project: true } },
    },
  }),
);

export const getProjects = cache(async (opts?: { featuredOnly?: boolean; take?: number }) =>
  prisma.project.findMany({
    where: { status: "PUBLISHED", ...(opts?.featuredOnly ? { isFeatured: true } : {}) },
    orderBy: [{ order: "asc" }, { completedAt: "desc" }],
    take: opts?.take,
    include: { services: { include: { service: true } } },
  }),
);

export const getProjectBySlug = cache(async (slug: string) =>
  prisma.project.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: {
      services: { include: { service: true } },
      testimonials: { where: { isActive: true } },
    },
  }),
);

export const getPosts = cache(
  async (opts?: { take?: number; skip?: number; categorySlug?: string; tagSlug?: string }) =>
    prisma.post.findMany({
      where: {
        status: "PUBLISHED",
        publishedAt: { lte: new Date() },
        ...(opts?.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
        ...(opts?.tagSlug ? { tags: { some: { tag: { slug: opts.tagSlug } } } } : {}),
      },
      orderBy: { publishedAt: "desc" },
      take: opts?.take,
      skip: opts?.skip,
      include: { category: true, author: true },
    }),
);

export const countPosts = cache(async (opts?: { categorySlug?: string }) =>
  prisma.post.count({
    where: {
      status: "PUBLISHED",
      publishedAt: { lte: new Date() },
      ...(opts?.categorySlug ? { category: { slug: opts.categorySlug } } : {}),
    },
  }),
);

export const getPostBySlug = cache(async (slug: string) =>
  prisma.post.findFirst({
    where: { slug, status: "PUBLISHED" },
    include: { category: true, author: true, tags: { include: { tag: true } } },
  }),
);

export const getPostCategories = cache(async () =>
  prisma.postCategory.findMany({ orderBy: { order: "asc" } }),
);

export const getPageBySlug = cache(async (slug: string) =>
  prisma.page.findFirst({ where: { slug, status: "PUBLISHED" } }),
);

export const getTestimonials = cache(async (opts?: { featuredOnly?: boolean; take?: number }) =>
  prisma.testimonial.findMany({
    where: { isActive: true, ...(opts?.featuredOnly ? { isFeatured: true } : {}) },
    orderBy: { order: "asc" },
    take: opts?.take,
  }),
);

export const getTeam = cache(async () =>
  prisma.teamMember.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
);

export const getStats = cache(async () =>
  prisma.stat.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
);

export const getProcessSteps = cache(async () =>
  prisma.processStep.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
);

export const getFaqs = cache(async (group?: string) =>
  prisma.faq.findMany({
    where: { isActive: true, serviceId: null, ...(group ? { group } : {}) },
    orderBy: { order: "asc" },
  }),
);

export const getClientLogos = cache(async () =>
  prisma.clientLogo.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
);

export const getHeroSlides = cache(async () =>
  prisma.heroSlide.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
);

export const getVideoSlides = cache(async () =>
  prisma.videoSlide.findMany({ where: { isActive: true }, orderBy: { order: "asc" } }),
);
