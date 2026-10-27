/**
 * Backfills the home page's new editable pieces with exactly what the page used
 * to render from code, so turning these on changes nothing visually until an
 * editor decides otherwise.
 *
 * Safe to re-run: every write is an upsert keyed on something stable, and
 * copy that an editor has already changed is left alone.
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { mariaDbConfig } from "../src/lib/db-config";
import { HOME_SECTIONS } from "../src/lib/home-sections";

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(mariaDbConfig()) });

/** The array that used to live at the top of the home page. */
const HIGHLIGHTS = [
  { icon: "Rocket", title: "Launch fast", description: "Sprint-based delivery with weekly demos, so momentum never stalls." },
  { icon: "ShieldCheck", title: "Own everything", description: "Source code, domains, hosting and ad accounts stay in your name." },
  { icon: "BadgeCheck", title: "Measurable work", description: "Every retainer reports on rankings, leads, spend and pipeline." },
  { icon: "Headset", title: "One point of contact", description: "A dedicated account manager across every service you buy." },
];

/**
 * Starting cards for "Top industries we serve", matched to the portals and
 * services Sahab India sells — LMS, locum management, limo and travel portals,
 * stores. Editable at /admin/industries.
 */
const INDUSTRIES = [
  { icon: "GraduationCap", name: "Education & EdTech", description: "LMS portals, institute websites and admission campaigns." },
  { icon: "HeartPulse", name: "Healthcare & Locum Staffing", description: "Clinic websites, locum management portals and patient enquiries." },
  { icon: "Plane", name: "Travel & Tourism", description: "Booking-ready travel portals, packages and seasonal ad campaigns." },
  { icon: "Car", name: "Limousine & Transport", description: "Limo booking portals, fleet dispatch and local search visibility." },
  { icon: "ShoppingBag", name: "Retail & E-commerce", description: "Shopify and custom stores, product ads and catalogue SEO." },
  { icon: "Building2", name: "Real Estate & Construction", description: "Project microsites, lead capture and ads that book site visits." },
  { icon: "UtensilsCrossed", name: "Hospitality & Restaurants", description: "Reservations, Google Business profiles, menus and reels." },
  { icon: "Briefcase", name: "Corporate & B2B Services", description: "CRM and HRMS portals, company websites and lead generation." },
];

const WHY = {
  whyEyebrow: "Why Sahab India",
  whyTitle: "An agency that behaves like your in-house team",
  whyBody:
    "No handoffs between vendors, no finger-pointing when a campaign underperforms. Strategy, build and growth sit in one place, with one plan and one report.",
  whyCtaLabel: "More about us",
  whyCtaUrl: "/about",
};

async function main() {
  // ------------------------------------------------------------ sections
  // A section added after the first run lands straight after the one it
  // follows in code, wherever an editor has since moved that one. Without
  // this it would take its index as an order and tie with whatever holds it.
  for (const [index, section] of HOME_SECTIONS.entries()) {
    if (index === 0 || (await prisma.homeSection.findUnique({ where: { key: section.key } }))) continue;
    const before = await prisma.homeSection.findUnique({ where: { key: HOME_SECTIONS[index - 1].key } });
    if (!before) continue;
    await prisma.homeSection.updateMany({ where: { order: { gt: before.order } }, data: { order: { increment: 1 } } });
    await prisma.homeSection.create({ data: { key: section.key, label: section.label, order: before.order + 1 } });
    console.log(`sections: added ${section.key} after ${before.key}`);
  }

  for (const [index, section] of HOME_SECTIONS.entries()) {
    await prisma.homeSection.upsert({
      where: { key: section.key },
      // An editor's ordering and spacing must survive a re-run; only the label
      // is refreshed, since that tracks the code.
      update: { label: section.label },
      create: { key: section.key, label: section.label, order: index },
    });
  }
  console.log(`sections: ${HOME_SECTIONS.length} in place`);

  // ---------------------------------------------------------- highlights
  const existing = await prisma.highlight.count();
  if (existing === 0) {
    await prisma.highlight.createMany({
      data: HIGHLIGHTS.map((h, order) => ({ ...h, order })),
    });
    console.log(`highlights: seeded ${HIGHLIGHTS.length}`);
  } else {
    console.log(`highlights: ${existing} already present, left alone`);
  }

  // ---------------------------------------------------------- industries
  const industries = await prisma.industry.count();
  if (industries === 0) {
    await prisma.industry.createMany({ data: INDUSTRIES.map((i, order) => ({ ...i, order })) });
    console.log(`industries: seeded ${INDUSTRIES.length}`);
  } else {
    console.log(`industries: ${industries} already present, left alone`);
  }

  // ------------------------------------------------------- why-us block
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 1 },
    select: { whyTitle: true, gaMeasurementId: true },
  });

  if (settings && !settings.whyTitle) {
    await prisma.siteSettings.update({ where: { id: 1 }, data: WHY });
    console.log("why block: copy backfilled from the code it replaces");
  } else {
    console.log("why block: already has copy, left alone");
  }

  // --------------------------------------------------------- analytics
  // The measurement ID the client sent. Only set when empty, so a later change
  // in the admin panel is not reverted by a re-run.
  const GA_ID = "G-PS0C6YL5WQ";
  if (settings && !settings.gaMeasurementId) {
    await prisma.siteSettings.update({ where: { id: 1 }, data: { gaMeasurementId: GA_ID } });
    console.log(`analytics: set to ${GA_ID}`);
  } else {
    console.log(`analytics: already set to ${settings?.gaMeasurementId}, left alone`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
