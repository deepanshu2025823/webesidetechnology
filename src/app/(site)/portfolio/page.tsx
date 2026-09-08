import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/site/PageHero";
import { PortfolioFilters, type FilterableProject } from "@/components/sections/PortfolioFilters";
import { CtaBand } from "@/components/sections/CtaBand";
import { JsonLd } from "@/components/JsonLd";
import { getProjects, getSettings } from "@/lib/queries";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildMetadata({
    title: "Portfolio & Case Studies",
    description:
      "Websites, apps, portals and marketing campaigns we have delivered — with the results each client cared about.",
    path: "/portfolio",
  });
}

/** Filter options, counted from the case studies actually on the page. */
function optionsFrom(entries: { slug: string; label: string }[]) {
  const counts = new Map<string, { slug: string; label: string; count: number }>();
  for (const entry of entries) {
    const existing = counts.get(entry.slug);
    if (existing) existing.count += 1;
    else counts.set(entry.slug, { ...entry, count: 1 });
  }
  return [...counts.values()].sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

export default async function PortfolioPage() {
  const [projects, settings] = await Promise.all([getProjects(), getSettings()]);

  const cards: FilterableProject[] = projects.map((project) => ({
    id: project.id,
    title: project.title,
    slug: project.slug,
    clientName: project.clientName,
    industry: project.industry,
    summary: project.summary,
    coverImage: project.coverImage,
    services: project.services.map((s) => ({ service: { title: s.service.title } })),
    serviceSlugs: project.services.map((s) => s.service.slug),
    tagSlugs: project.tags.map((t) => t.tag.slug),
  }));

  // Counted across every project, so a chip's number is what selecting it shows.
  const serviceOptions = optionsFrom(
    projects.flatMap((p) => p.services.map((s) => ({ slug: s.service.slug, label: s.service.title }))),
  );
  const tagOptions = optionsFrom(
    projects.flatMap((p) => p.tags.map((t) => ({ slug: t.tag.slug, label: t.tag.name }))),
  );

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Portfolio", path: "/portfolio" }])} />
      <PageHero
        eyebrow="Our work"
        title="Projects, campaigns and the numbers behind them"
        description="A selection of engagements across technology and marketing. Every case study lists the brief, what we built and what changed afterwards."
        crumbs={[{ name: "Portfolio", path: "/portfolio" }]}
      />

      <section className="py-16 sm:py-20">
        <Container size="wide">
          {cards.length ? (
            <PortfolioFilters projects={cards} services={serviceOptions} tags={tagOptions} />
          ) : (
            <p className="py-16 text-center text-slate-500">Case studies are being added. Check back shortly.</p>
          )}
        </Container>
      </section>

      <CtaBand
        title={settings.ctaTitle}
        subtitle={settings.ctaSubtitle}
        buttonLabel={settings.ctaButton}
        buttonUrl={settings.ctaUrl}
        phone={settings.phone}
      />
    </>
  );
}
