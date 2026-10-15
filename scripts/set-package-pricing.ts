/**
 * Load the calculator with the packages Sahab India actually advertises.
 *
 * "Is pricing ke according bnao calculator. Ya phir mujhe calculator ki pricing
 * apne according backend se set krne ka option do. Taaki client isko use kre to
 * pricing sahi dikhe calculator me."
 *
 * The calculator was still carrying the worked example it shipped with —
 * ₹45,000 for a business website, ₹1,45,000 for a store — none of which matches
 * the published price list. This replaces that with the real one.
 *
 * Every figure here stays editable at /admin/calculator, which is the second
 * half of the same request: nothing below is hard-coded into the site, it is
 * only the starting configuration.
 *
 *   npx tsx scripts/set-package-pricing.ts          # show what would change
 *   npx tsx scripts/set-package-pricing.ts --apply  # write it
 *
 * Deliberately two steps: it REPLACES the existing questions, so a dry run is
 * the default and the real thing has to be asked for.
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { mariaDbConfig } from "../src/lib/db-config";

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(mariaDbConfig()) });

type Seed = {
  label: string;
  help?: string;
  kind: "SINGLE" | "MULTI" | "QUANTITY" | "TOGGLE";
  required?: boolean;
  options: { label: string; help?: string; price?: number; percent?: number; isDefault?: boolean }[];
};

/**
 * Straight off the price list. The "starting from" wording is kept in the help
 * text rather than dropped, because that is what the figures mean.
 */
const GROUPS: Seed[] = [
  {
    label: "Website or application",
    help: "Starting prices. One-time or monthly — we confirm which on the call.",
    kind: "SINGLE",
    required: true,
    options: [
      {
        label: "Not needed — marketing only",
        help: "Skip the build and go straight to SEO or ads.",
        price: 0,
      },
      {
        label: "Shopify store website",
        help: "Shopify store, responsive design, collection setup, payment gateway and integrations.",
        price: 19_999,
      },
      {
        label: "Custom e-commerce website",
        help:
          "Custom design, product and category management, customer management, payment gateway, " +
          "order management, WhatsApp integration, admin panel, mobile responsive, basic SEO setup.",
        price: 34_999,
        isDefault: true,
      },
      {
        label: "Web portal / web app",
        help:
          "Custom-built to your workflow — class, sales, gym, clinic, hiring, event, travel booking, " +
          "real estate, business listing, limo/cab booking and more.",
        price: 49_999,
      },
    ],
  },
  {
    label: "Digital marketing",
    help: "Monthly retainer, billed separately from the build. Ad spend is not included.",
    kind: "SINGLE",
    required: true,
    options: [
      {
        label: "Not needed",
        help: "Build only.",
        price: 0,
        isDefault: true,
      },
      {
        label: "Ads package",
        help:
          "Meta ads campaign management, Facebook & Instagram ads, Google Ads management, campaign " +
          "strategy & setup, audience & competitor research, ad copy & creative guidance, lead " +
          "generation campaigns, conversion & performance tracking, weekly optimisation, monthly report.",
        price: 14_999,
      },
      {
        label: "SEO package",
        help:
          "Complete website SEO audit, keyword research, on-page SEO, technical SEO, meta tags & " +
          "content optimisation, Google Search Console setup, Google Business Profile optimisation, " +
          "manual off-page SEO, quality link building, monthly SEO reports, ranking & traffic monitoring.",
        price: 14_999,
      },
      {
        label: "Combined — SEO + paid ads",
        help:
          "Complete SEO strategy, Meta and Google Ads management, keyword & competitor research, " +
          "on-page & technical SEO, lead generation campaigns, landing page recommendations, " +
          "conversion optimisation, continuous campaign optimisation, monthly reports, dedicated " +
          "growth strategy.",
        price: 19_999,
      },
    ],
  },
];

const SETTINGS = {
  isEnabled: true,
  heading: "Project cost calculator",
  subheading:
    "Pick what you need and see the price straight away — the same packages we quote, with no waiting for a callback.",
  // The package prices are complete in themselves. A base price, a tax uplift
  // or a ± range would all mean the calculator quoting a number the price list
  // does not, which is the whole complaint.
  basePrice: 0,
  taxPercent: 0,
  variancePct: 0,
  ctaLabel: "Email me this estimate",
  disclaimer:
    "Starting prices for the packages shown. Final pricing depends on scope and is confirmed on a short call.",
};

async function main() {
  const apply = process.argv.includes("--apply");

  const existing = await prisma.calculatorGroup.findMany({
    select: { id: true, label: true, _count: { select: { options: true } } },
    orderBy: { order: "asc" },
  });

  console.log(apply ? "Applying package pricing.\n" : "DRY RUN — nothing will be written. Pass --apply to write.\n");

  if (existing.length) {
    console.log("Replacing these questions:");
    for (const group of existing) console.log(`  − ${group.label} (${group._count.options} answers)`);
    console.log("");
  }

  console.log("With:");
  for (const group of GROUPS) {
    console.log(`  + ${group.label}`);
    for (const option of group.options) {
      const price = option.price ? `₹${option.price.toLocaleString("en-IN")}` : "included";
      console.log(`      ${option.label} — ${price}`);
    }
  }
  console.log(`\n  base ₹${SETTINGS.basePrice} · tax ${SETTINGS.taxPercent}% · variance ±${SETTINGS.variancePct}%`);

  if (!apply) {
    console.log("\nNothing written. Re-run with --apply to make it so.");
    return;
  }

  await prisma.$transaction(async (tx) => {
    // Options cascade from their group, but be explicit rather than rely on it.
    await tx.calculatorOption.deleteMany({});
    await tx.calculatorGroup.deleteMany({});

    for (const [index, group] of GROUPS.entries()) {
      await tx.calculatorGroup.create({
        data: {
          label: group.label,
          help: group.help ?? "",
          kind: group.kind,
          required: group.required ?? false,
          order: index,
          options: {
            create: group.options.map((option, i) => ({
              label: option.label,
              help: option.help ?? "",
              price: option.price ?? 0,
              percent: option.percent ?? 100,
              order: i,
              isDefault: option.isDefault ?? false,
            })),
          },
        },
      });
    }

    await tx.calculatorSettings.upsert({
      where: { id: 1 },
      create: { id: 1, ...SETTINGS },
      update: SETTINGS,
    });
  });

  console.log("\nDone. Everything above is editable at /admin/calculator.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
