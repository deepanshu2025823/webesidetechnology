import { notFound } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { ExternalLink, Quote } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/site/PageHero";
import { CtaBand } from "@/components/sections/CtaBand";
import { JsonLd } from "@/components/JsonLd";
import { buttonClass } from "@/components/ui/Button";
import { getProjectBySlug, getProjects, getSettings } from "@/lib/queries";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { absoluteUrl, asArray, formatDate } from "@/lib/utils";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const projects = await getProjects();
  return projects.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const project = await getProjectBySlug(slug);
  if (!project) return buildMetadata({ title: "Case study not found", noIndex: true });

  return buildMetadata({
    title: project.metaTitle || `${project.title} — Case Study`,
    description: project.metaDescription || project.summary,
    keywords: project.metaKeywords,
    path: `/portfolio/${project.slug}`,
    image: project.coverImage,
    type: "article",
  });
}

export default async function ProjectDetailPage({ params }: Params) {
  const { slug } = await params;
  const [project, settings] = await Promise.all([getProjectBySlug(slug), getSettings()]);
  if (!project) notFound();

  const results = asArray<{ label: string; value: string }>(project.results);
  const gallery = asArray<string>(project.gallery);
  const tech = asArray<string>(project.technologies);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Portfolio", path: "/portfolio" },
          { name: project.title, path: `/portfolio/${project.slug}` },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "CreativeWork",
          name: project.title,
          description: project.summary,
          url: absoluteUrl(`/portfolio/${project.slug}`),
          ...(project.coverImage ? { image: absoluteUrl(project.coverImage) } : {}),
          ...(project.completedAt ? { dateCreated: new Date(project.completedAt).toISOString() } : {}),
          creator: { "@type": "Organization", name: settings.siteName },
        }}
      />

      <PageHero
        eyebrow={project.clientName || "Case study"}
        title={project.title}
        description={project.summary}
        crumbs={[
          { name: "Portfolio", path: "/portfolio" },
          { name: project.title, path: `/portfolio/${project.slug}` },
        ]}
        image={project.coverImage}
      />

      {/* Fact strip */}
      <section className="border-b border-navy-900/10 bg-cream py-8">
        <Container size="wide">
          <dl className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {project.clientName ? <Fact label="Client" value={project.clientName} /> : null}
            {project.industry ? <Fact label="Industry" value={project.industry} /> : null}
            {project.services.length ? (
              <Fact label="Services" value={project.services.map((s) => s.service.title).join(", ")} />
            ) : null}
            {project.completedAt ? (
              <Fact label="Delivered" value={formatDate(project.completedAt, { month: "long", year: "numeric" })} />
            ) : null}
          </dl>
        </Container>
      </section>

      <section className="py-16 sm:py-20">
        <Container size="wide">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-8">
              {project.challenge ? (
                <div>
                  <h2 className="text-2xl text-navy-900">The challenge</h2>
                  <p className="mt-4 text-base leading-relaxed text-slate-600">{project.challenge}</p>
                </div>
              ) : null}

              {project.solution ? (
                <div className="mt-12">
                  <h2 className="text-2xl text-navy-900">What we did</h2>
                  <div
                    className="prose prose-brand mt-4 max-w-none"
                    dangerouslySetInnerHTML={{ __html: project.solution }}
                  />
                </div>
              ) : null}

              {gallery.length ? (
                <ul className="mt-12 grid gap-5 sm:grid-cols-2">
                  {gallery.map((src) => (
                    <li key={src} className="overflow-hidden rounded-2xl border border-navy-900/10">
                      <Image
                        src={src}
                        alt={`${project.title} screenshot`}
                        width={800}
                        height={560}
                        className="h-auto w-full object-cover"
                      />
                    </li>
                  ))}
                </ul>
              ) : null}

              {project.testimonials.length ? (
                <figure className="mt-12 rounded-2xl border border-gold-400/40 bg-gold-50 p-8">
                  <Quote className="size-8 text-gold-500" aria-hidden />
                  <blockquote className="mt-4 font-display text-xl leading-relaxed text-navy-900">
                    “{project.testimonials[0].quote}”
                  </blockquote>
                  <figcaption className="mt-5 text-sm text-slate-600">
                    <span className="font-semibold text-navy-900">{project.testimonials[0].authorName}</span>
                    {project.testimonials[0].authorRole ? `, ${project.testimonials[0].authorRole}` : ""}
                    {project.testimonials[0].company ? ` · ${project.testimonials[0].company}` : ""}
                  </figcaption>
                </figure>
              ) : null}
            </div>

            <aside className="lg:col-span-4">
              <div className="sticky top-28 space-y-6">
                {results.length ? (
                  <div className="rounded-2xl border border-navy-900/10 bg-navy-950 p-6 text-white">
                    <h2 className="text-base font-semibold">Outcomes</h2>
                    <dl className="mt-5 space-y-5">
                      {results.map((r) => (
                        <div key={r.label}>
                          <dd className="font-display text-3xl text-gold-300">{r.value}</dd>
                          <dt className="mt-1 text-sm text-navy-300">{r.label}</dt>
                        </div>
                      ))}
                    </dl>
                  </div>
                ) : null}

                {tech.length ? (
                  <div className="rounded-2xl border border-navy-900/10 bg-white p-6">
                    <h2 className="text-base font-semibold text-navy-900">Stack & channels</h2>
                    <ul className="mt-4 flex flex-wrap gap-2">
                      {tech.map((t) => (
                        <li key={t} className="rounded-full bg-navy-50 px-3 py-1 text-xs font-medium text-navy-700">
                          {t}
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}

                {project.websiteUrl ? (
                  <a
                    href={project.websiteUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClass("outline", "md", "w-full")}
                  >
                    Visit live site
                    <ExternalLink className="size-4" aria-hidden />
                  </a>
                ) : null}

                <Link href="/portfolio" className={buttonClass("ghost", "md", "w-full")}>
                  ← All case studies
                </Link>
              </div>
            </aside>
          </div>
        </Container>
      </section>

      <CtaBand
        title="Want results like these?"
        subtitle={settings.ctaSubtitle}
        buttonLabel={settings.ctaButton}
        buttonUrl={settings.ctaUrl}
        phone={settings.phone}
      />
    </>
  );
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</dt>
      <dd className="mt-1.5 text-sm font-medium text-navy-900">{value}</dd>
    </div>
  );
}
