import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/site/PageHero";
import { JsonLd } from "@/components/JsonLd";
import { prisma } from "@/lib/prisma";
import { getPageBySlug } from "@/lib/queries";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

type Params = { params: Promise<{ slug: string }> };

// Slugs owned by dedicated routes; the CMS must never shadow them.
const RESERVED = new Set(["about", "services", "portfolio", "blog", "contact", "admin", "api"]);

export async function generateStaticParams() {
  const pages = await prisma.page.findMany({
    where: { status: "PUBLISHED" },
    select: { slug: true },
  });
  return pages.filter((p) => !RESERVED.has(p.slug)).map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const page = await getPageBySlug(slug);
  if (!page) return buildMetadata({ title: "Page not found", noIndex: true });

  return buildMetadata({
    title: page.metaTitle || page.title,
    description: page.metaDescription,
    keywords: page.metaKeywords,
    path: `/${page.slug}`,
    image: page.heroImage,
    noIndex: !page.showInSitemap,
  });
}

export default async function CmsPage({ params }: Params) {
  const { slug } = await params;
  if (RESERVED.has(slug)) notFound();

  const page = await getPageBySlug(slug);
  if (!page) notFound();

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: page.title, path: `/${page.slug}` }])} />
      <PageHero
        title={page.heroTitle || page.title}
        description={page.heroSubtitle}
        crumbs={[{ name: page.title, path: `/${page.slug}` }]}
        image={page.heroImage}
      />

      <section className="py-16 sm:py-20">
        <Container size="narrow">
          <div className="prose prose-brand max-w-none" dangerouslySetInnerHTML={{ __html: page.content }} />
        </Container>
      </section>
    </>
  );
}
