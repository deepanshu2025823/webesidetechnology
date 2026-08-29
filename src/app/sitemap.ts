import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 3600;

/** Full XML sitemap built from live CMS content. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [services, projects, posts, pages, categories] = await Promise.all([
    prisma.service.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    prisma.project.findMany({ where: { status: "PUBLISHED" }, select: { slug: true, updatedAt: true } }),
    prisma.post.findMany({
      where: { status: "PUBLISHED", publishedAt: { lte: new Date() } },
      select: { slug: true, updatedAt: true },
    }),
    prisma.page.findMany({
      where: { status: "PUBLISHED", showInSitemap: true },
      select: { slug: true, updatedAt: true },
    }),
    prisma.postCategory.findMany({ select: { slug: true } }),
  ]);

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: absoluteUrl("/"), changeFrequency: "weekly" as const, priority: 1 },
    { url: absoluteUrl("/services"), changeFrequency: "weekly" as const, priority: 0.9 },
    { url: absoluteUrl("/portfolio"), changeFrequency: "weekly" as const, priority: 0.8 },
    { url: absoluteUrl("/about"), changeFrequency: "monthly" as const, priority: 0.7 },
    { url: absoluteUrl("/blog"), changeFrequency: "daily" as const, priority: 0.8 },
    { url: absoluteUrl("/contact"), changeFrequency: "monthly" as const, priority: 0.7 },
  ].map((r) => ({ ...r, lastModified: new Date() }));

  return [
    ...staticRoutes,
    ...services.map((s) => ({
      url: absoluteUrl(`/services/${s.slug}`),
      lastModified: s.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.85,
    })),
    ...projects.map((p) => ({
      url: absoluteUrl(`/portfolio/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.7,
    })),
    ...posts.map((p) => ({
      url: absoluteUrl(`/blog/${p.slug}`),
      lastModified: p.updatedAt,
      changeFrequency: "monthly" as const,
      priority: 0.6,
    })),
    ...categories.map((c) => ({
      url: absoluteUrl(`/blog/category/${c.slug}`),
      lastModified: new Date(),
      changeFrequency: "weekly" as const,
      priority: 0.5,
    })),
    ...pages
      .filter((p) => !["about", "services", "portfolio", "blog", "contact"].includes(p.slug))
      .map((p) => ({
        url: absoluteUrl(`/${p.slug}`),
        lastModified: p.updatedAt,
        changeFrequency: "yearly" as const,
        priority: 0.4,
      })),
  ];
}
