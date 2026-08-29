import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/site/PageHero";
import { ServiceGrid } from "@/components/sections/ServiceGrid";
import { CtaBand } from "@/components/sections/CtaBand";
import { JsonLd } from "@/components/JsonLd";
import { getServiceCategories, getSettings } from "@/lib/queries";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";

export async function generateMetadata() {
  return buildMetadata({
    title: "Our Services — Web, App, SEO, Social & Ads",
    description:
      "Website and app development, web portals, SEO, social media, Meta and Google Ads, PR, events, blogs, WhatsApp, SMS and IVR — delivered by one accountable team.",
    path: "/services",
  });
}

export default async function ServicesPage() {
  const [categories, settings] = await Promise.all([getServiceCategories(), getSettings()]);
  const withServices = categories.filter((c) => c.services.length);

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Services", path: "/services" }])} />
      <PageHero
        eyebrow="Capabilities"
        title="Everything you need to launch, market and grow"
        description="Pick a single service or hand us the whole stack. Each one runs on a documented workflow, a named owner and reporting you can hold us to."
        crumbs={[{ name: "Services", path: "/services" }]}
      />

      {withServices.map((category, i) => (
        <section key={category.id} className={i % 2 === 1 ? "bg-cream py-16 sm:py-20" : "py-16 sm:py-20"}>
          <Container size="wide">
            <div className="max-w-2xl">
              <p className="rule-gold text-xs font-semibold uppercase tracking-[0.22em] text-gold-700">
                {String(i + 1).padStart(2, "0")}
              </p>
              <h2 className="mt-5 text-2xl text-navy-900 sm:text-3xl">{category.name}</h2>
              {category.description ? (
                <p className="mt-3 text-base leading-relaxed text-slate-600">{category.description}</p>
              ) : null}
            </div>

            <div className="mt-10">
              <ServiceGrid services={category.services} />
            </div>
          </Container>
        </section>
      ))}

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
