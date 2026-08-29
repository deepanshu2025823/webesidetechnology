import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/site/PageHero";
import { ProjectCard } from "@/components/sections/ProjectCard";
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

export default async function PortfolioPage() {
  const [projects, settings] = await Promise.all([getProjects(), getSettings()]);

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
          {projects.length ? (
            <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {projects.map((project, i) => (
                <li key={project.id}>
                  {/* The first row is above the fold; eager-load it for LCP. */}
                  <ProjectCard project={project} priority={i < 3} />
                </li>
              ))}
            </ul>
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
