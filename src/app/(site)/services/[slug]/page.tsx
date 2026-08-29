import { notFound } from "next/navigation";
import Link from "next/link";
import { Check, CircleDollarSign } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { PageHero } from "@/components/site/PageHero";
import { Icon } from "@/components/ui/Icon";
import { FaqAccordion } from "@/components/sections/FaqAccordion";
import { ProjectCard } from "@/components/sections/ProjectCard";
import { CtaBand } from "@/components/sections/CtaBand";
import { JsonLd } from "@/components/JsonLd";
import { ContactForm } from "@/components/site/ContactForm";
import { getServiceBySlug, getServices, getSettings } from "@/lib/queries";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { absoluteUrl, asArray, excerptFrom } from "@/lib/utils";

type Params = { params: Promise<{ slug: string }> };

export async function generateStaticParams() {
  const services = await getServices();
  return services.map((s) => ({ slug: s.slug }));
}

export async function generateMetadata({ params }: Params) {
  const { slug } = await params;
  const service = await getServiceBySlug(slug);
  if (!service) return buildMetadata({ title: "Service not found", noIndex: true });

  return buildMetadata({
    title: service.metaTitle || `${service.title} Services`,
    description: service.metaDescription || service.shortDescription,
    keywords: service.metaKeywords,
    path: `/services/${service.slug}`,
    image: service.coverImage,
  });
}

export default async function ServiceDetailPage({ params }: Params) {
  const { slug } = await params;
  const [service, settings, allServices] = await Promise.all([
    getServiceBySlug(slug),
    getSettings(),
    getServices(),
  ]);
  if (!service) notFound();

  const features = asArray<{ title: string; description: string }>(service.features);
  const steps = asArray<{ title: string; description: string }>(service.processSteps);
  const deliverables = asArray<string>(service.deliverables);
  const related = allServices.filter((s) => s.id !== service.id && s.categoryId === service.categoryId).slice(0, 3);

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Services", path: "/services" },
          { name: service.title, path: `/services/${service.slug}` },
        ])}
      />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "Service",
          name: service.title,
          serviceType: service.category?.name ?? service.title,
          description: service.metaDescription || service.shortDescription,
          url: absoluteUrl(`/services/${service.slug}`),
          provider: { "@type": "Organization", name: settings.siteName, url: absoluteUrl("/") },
          areaServed: settings.country || "IN",
          ...(service.priceFrom
            ? {
                offers: {
                  "@type": "Offer",
                  price: service.priceFrom,
                  priceCurrency: "INR",
                  url: absoluteUrl(`/services/${service.slug}`),
                },
              }
            : {}),
        }}
      />
      {service.faqs.length ? (
        <JsonLd
          data={{
            "@context": "https://schema.org",
            "@type": "FAQPage",
            mainEntity: service.faqs.map((f) => ({
              "@type": "Question",
              name: f.question,
              acceptedAnswer: { "@type": "Answer", text: f.answer },
            })),
          }}
        />
      ) : null}

      <PageHero
        eyebrow={service.category?.name ?? "Service"}
        title={service.heroTitle || service.title}
        description={service.heroSubtitle || service.shortDescription}
        crumbs={[
          { name: "Services", path: "/services" },
          { name: service.title, path: `/services/${service.slug}` },
        ]}
        image={service.coverImage}
      />

      <section className="py-16 sm:py-20">
        <Container size="wide">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-8">
              {service.content ? (
                <div
                  className="prose prose-brand max-w-none"
                  // Content is authored in the admin panel by trusted staff.
                  dangerouslySetInnerHTML={{ __html: service.content }}
                />
              ) : (
                <p className="text-lg leading-relaxed text-slate-600">{service.shortDescription}</p>
              )}

              {features.length ? (
                <div className="mt-14">
                  <h2 className="text-2xl text-navy-900">What&apos;s included</h2>
                  <ul className="mt-7 grid gap-5 sm:grid-cols-2">
                    {features.map((feature) => (
                      <li key={feature.title} className="rounded-2xl border border-navy-900/10 bg-white p-6">
                        <h3 className="flex items-start gap-2 text-base font-semibold text-navy-900">
                          <Check className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
                          {feature.title}
                        </h3>
                        <p className="mt-2 pl-6 text-sm leading-relaxed text-slate-600">{feature.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}

              {steps.length ? (
                <div className="mt-14">
                  <h2 className="text-2xl text-navy-900">How the engagement runs</h2>
                  <ol className="mt-7 space-y-5">
                    {steps.map((step, i) => (
                      <li key={step.title} className="flex gap-5 rounded-2xl border border-navy-900/10 bg-cream p-6">
                        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-900 font-display text-sm text-gold-300">
                          {i + 1}
                        </span>
                        <div>
                          <h3 className="text-base font-semibold text-navy-900">{step.title}</h3>
                          <p className="mt-1.5 text-sm leading-relaxed text-slate-600">{step.description}</p>
                        </div>
                      </li>
                    ))}
                  </ol>
                </div>
              ) : null}

              {service.projects.length ? (
                <div className="mt-14">
                  <h2 className="text-2xl text-navy-900">Work in this service</h2>
                  <ul className="mt-7 grid gap-6 sm:grid-cols-2">
                    {service.projects.slice(0, 2).map(({ project }) => (
                      <li key={project.id}>
                        <ProjectCard project={{ ...project, services: [] }} />
                      </li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>

            {/* Sidebar */}
            <aside className="lg:col-span-4">
              <div className="sticky top-28 space-y-6">
                <div className="rounded-2xl border border-navy-900/10 bg-white p-6 shadow-sm">
                  <span className="grid size-12 place-items-center rounded-xl bg-navy-900 text-gold-400">
                    <Icon name={service.icon} className="size-6" />
                  </span>
                  <h2 className="mt-4 text-lg font-semibold text-navy-900">{service.title}</h2>

                  {service.priceFrom ? (
                    <p className="mt-3 flex items-baseline gap-1.5 text-navy-900">
                      <CircleDollarSign className="size-4 text-gold-600" aria-hidden />
                      <span className="text-sm text-slate-500">Starting at</span>
                      <span className="font-display text-2xl">₹{service.priceFrom.toLocaleString("en-IN")}</span>
                      <span className="text-xs text-slate-500">/ {service.priceUnit}</span>
                    </p>
                  ) : null}

                  {deliverables.length ? (
                    <ul className="mt-5 space-y-2.5 border-t border-navy-900/5 pt-5">
                      {deliverables.map((item) => (
                        <li key={item} className="flex gap-2 text-sm text-slate-600">
                          <Check className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
                          {item}
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>

                <div className="rounded-2xl border border-navy-900/10 bg-cream p-6">
                  <h2 className="text-base font-semibold text-navy-900">Request a quote</h2>
                  <p className="mt-1 text-sm text-slate-600">Tell us the goal — we&apos;ll reply within one working day.</p>
                  <ContactForm
                    className="mt-5"
                    compact
                    services={allServices.map((s) => s.title)}
                    defaultService={service.title}
                    source={`service:${service.slug}`}
                  />
                </div>

                {related.length ? (
                  <div className="rounded-2xl border border-navy-900/10 bg-white p-6">
                    <h2 className="text-base font-semibold text-navy-900">Related services</h2>
                    <ul className="mt-4 space-y-2">
                      {related.map((r) => (
                        <li key={r.id}>
                          <Link
                            href={`/services/${r.slug}`}
                            className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm text-navy-800 transition-colors hover:bg-gold-50 hover:text-gold-800"
                          >
                            <Icon name={r.icon} className="size-4 text-gold-600" />
                            {r.title}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                ) : null}
              </div>
            </aside>
          </div>
        </Container>
      </section>

      {service.faqs.length ? (
        <section className="bg-cream py-16 sm:py-20">
          <Container>
            <SectionHeading eyebrow="FAQ" title={`${service.title} questions`} align="center" />
            <div className="mt-10">
              <FaqAccordion items={service.faqs} />
            </div>
          </Container>
        </section>
      ) : null}

      <CtaBand
        title={settings.ctaTitle}
        subtitle={excerptFrom(service.shortDescription, 140)}
        buttonLabel={settings.ctaButton}
        buttonUrl={settings.ctaUrl}
        phone={settings.phone}
      />
    </>
  );
}
