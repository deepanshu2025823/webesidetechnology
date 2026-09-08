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

/**
 * The distinct filter options across the case studies on the page, in the
 * order given. Services keep the catalogue order the admin panel sets, so the
 * row reads the same way as the Services menu.
 */
function optionsFrom(entries: { slug: string; label: string; sort: number }[]) {
  const seen = new Map<string, { slug: string; label: string; sort: number }>();
  for (const entry of entries) {
    if (!seen.has(entry.slug)) seen.set(entry.slug, entry);
  }
  return [...seen.values()]
    .sort((a, b) => a.sort - b.sort || a.label.localeCompare(b.label))
    .map(({ slug, label }) => ({ slug, label }));
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

  // Only services and tags that actually carry a case study — a chip that leads
  // to an empty grid is worse than no chip.
  const serviceOptions = optionsFrom(
    projects.flatMap((p) =>
      p.services.map((s) => ({ slug: s.service.slug, label: s.service.title, sort: s.service.order })),
    ),
  );
  const tagOptions = optionsFrom(
    projects.flatMap((p) => p.tags.map((t) => ({ slug: t.tag.slug, label: t.tag.name, sort: 0 }))),
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
