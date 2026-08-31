import { notFound } from "next/navigation";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/site/PageHero";
import { CostCalculator } from "@/components/site/CostCalculator";
import { CtaBand } from "@/components/sections/CtaBand";
import { JsonLd } from "@/components/JsonLd";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/queries";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import type { CalcGroup } from "@/lib/calculator";

export async function generateMetadata() {
  return buildMetadata({
    title: "Project Cost Calculator",
    description:
      "Price your website, app or marketing project in a minute. Pick what you need and get an indicative range instantly — no call required.",
    path: "/cost-calculator",
  });
}

export default async function CostCalculatorPage() {
  const [config, groups, settings] = await Promise.all([
    prisma.calculatorSettings.findUnique({ where: { id: 1 } }),
    prisma.calculatorGroup.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      include: { options: { orderBy: { order: "asc" } } },
    }),
    getSettings(),
  ]);

  // Switched off in admin means the page should not exist, not render empty.
  if (config && !config.isEnabled) notFound();

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Cost calculator", path: "/cost-calculator" }])} />
      <PageHero
        eyebrow="Estimate"
        title={config?.heading ?? "Project cost calculator"}
        description={
          config?.subheading ||
          "Tell us roughly what you need and see an indicative range straight away. No obligation, and no waiting for a callback."
        }
        crumbs={[{ name: "Cost calculator", path: "/cost-calculator" }]}
      />

      <section className="py-14 sm:py-20">
        <Container size="wide">
          <CostCalculator
            groups={groups as unknown as CalcGroup[]}
            config={{
              basePrice: config?.basePrice ?? 0,
              taxPercent: config?.taxPercent ?? 18,
              variancePct: config?.variancePct ?? 15,
            }}
            ctaLabel={config?.ctaLabel ?? "Email me this estimate"}
            disclaimer={
              config?.disclaimer ||
              "This is an indicative range generated from your selections, not a quotation. Final pricing follows a scoping call."
            }
          />
        </Container>
      </section>

      <CtaBand
        title="Prefer to talk it through?"
        subtitle="Send us the brief and we'll come back with a scoped proposal and a firm price."
        buttonLabel={settings.ctaButton}
        buttonUrl={settings.ctaUrl}
        phone={settings.phone}
      />
    </>
  );
}
