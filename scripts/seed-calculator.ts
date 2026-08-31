/**
 * Starter configuration for the website cost calculator.
 *
 * This is a working example, not the final pricing — every question, answer and
 * figure is editable at /admin/calculator. Run it once to give the client
 * something to edit rather than a blank screen:
 *
 *   npx tsx scripts/seed-calculator.ts
 *
 * It is a no-op if any questions already exist, so it can never overwrite a
 * configuration the team has started building.
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

const GROUPS: Seed[] = [
  {
    label: "What do you need?",
    help: "Pick the main piece of work. You can add extras further down.",
    kind: "SINGLE",
    required: true,
    options: [
      { label: "Business website", help: "Brochure site with up to 10 pages.", price: 45_000, isDefault: true },
      { label: "E-commerce store", help: "Catalogue, cart, payments and order management.", price: 145_000 },
      { label: "Web portal / custom software", help: "Logins, dashboards, workflows.", price: 250_000 },
      { label: "Mobile app", help: "Android and iOS.", price: 350_000 },
      { label: "Marketing only", help: "No build — SEO, social or paid media.", price: 0 },
    ],
  },
  {
    label: "How many pages or screens?",
    help: "Roughly. We will confirm during scoping.",
    kind: "QUANTITY",
    options: [{ label: "Additional page", help: "Beyond the pages included above.", price: 4_000 }],
  },
  {
    label: "Design",
    kind: "SINGLE",
    required: true,
    options: [
      { label: "Template-based", help: "A polished theme, customised to your brand.", price: 0, isDefault: true },
      { label: "Custom design", help: "Designed from scratch to your brand.", price: 60_000 },
      { label: "Custom design + motion", help: "Bespoke design with animation and interaction.", price: 120_000 },
    ],
  },
  {
    label: "Add-ons",
    help: "Anything you want built alongside the main scope.",
    kind: "MULTI",
    options: [
      { label: "Content writing", help: "Copy for every page.", price: 25_000 },
      { label: "Logo & brand kit", price: 30_000 },
      { label: "Payment gateway integration", price: 20_000 },
      { label: "WhatsApp / CRM integration", price: 25_000 },
      { label: "Multi-language", price: 40_000 },
      { label: "Blog & newsletter setup", price: 15_000 },
    ],
  },
  {
    label: "Ongoing marketing",
    help: "Monthly retainers, charged separately from the build.",
    kind: "MULTI",
    options: [
      { label: "SEO retainer", help: "Per month.", price: 25_000 },
      { label: "Social media management", help: "Per month.", price: 30_000 },
      { label: "Paid ads management", help: "Per month, excluding ad spend.", price: 25_000 },
    ],
  },
  {
    label: "Timeline",
    kind: "SINGLE",
    required: true,
    options: [
      { label: "Standard", help: "Our normal delivery schedule.", percent: 100, isDefault: true },
      { label: "Priority", help: "Roughly 30% faster.", percent: 115 },
      { label: "Rush", help: "Dedicated team, fastest possible.", percent: 135 },
    ],
  },
];

async function main() {
  const existing = await prisma.calculatorGroup.count();
  if (existing > 0) {
    console.log(`Calculator already has ${existing} question(s) — leaving it alone.`);
    return;
  }

  await prisma.calculatorSettings.upsert({
    where: { id: 1 },
    create: {
      id: 1,
      isEnabled: true,
      heading: "Project cost calculator",
      subheading:
        "Pick what you need and see an indicative range straight away. No obligation, and no waiting for a callback.",
      basePrice: 15_000,
      taxPercent: 18,
      variancePct: 15,
      ctaLabel: "Email me this estimate",
      disclaimer:
        "This is an indicative range generated from your selections, not a quotation. Final pricing follows a scoping call.",
    },
    update: {},
  });

  for (const [index, group] of GROUPS.entries()) {
    await prisma.calculatorGroup.create({
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

  console.log(`Seeded ${GROUPS.length} questions and their answers.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
