/**
 * One-off rebrand pass over the live database: rewrites the old brand name and
 * domain in editor-managed site content.
 *
 * Only public-site content is touched. CRM and audit rows (enquiries, activity
 * logs, notes, quotations) are deliberately left alone - those record what a
 * person actually wrote or what actually happened, and rewriting them would
 * falsify the record.
 *
 *   npx tsx scripts/rebrand.ts --dry-run   # report what would change
 *   npx tsx scripts/rebrand.ts             # apply
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { mariaDbConfig } from "../src/lib/db-config";

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(mariaDbConfig()) });

const DRY_RUN = process.argv.includes("--dry-run");

/** Applied in order; longest pattern first so the domain is not half-rewritten. */
const REPLACEMENTS: Array<[from: string, to: string]> = [
  ["webesidetechnology.com", "sahabindia.com"],
  ["Webeside Technology", "Sahab India"],
  ["webeside technology", "sahab india"],
  ["webesidetechnology", "sahabindia"],
  ["Webeside", "Sahab India"],
  ["webeside", "sahabindia"],
];

/** Editor-managed content tables and the text columns worth rewriting. */
const TARGETS: Record<string, string[]> = {
  SiteSettings: [
    "siteName", "tagline", "description", "email", "altEmail",
    "facebook", "instagram", "linkedin", "twitter", "youtube",
    "footerAbout", "ctaTitle", "ctaSubtitle",
    "metaTitle", "metaDescription", "metaKeywords",
  ],
  MenuItem: ["label", "url"],
  ServiceCategory: ["name", "description"],
  Service: [
    "title", "shortDescription", "heroTitle", "heroSubtitle",
    "metaTitle", "metaDescription", "metaKeywords",
  ],
  Page: [
    "title", "heroTitle", "heroSubtitle", "content",
    "metaTitle", "metaDescription", "metaKeywords",
  ],
  PostCategory: ["name", "description"],
  Post: ["title", "excerpt", "content", "metaTitle", "metaDescription", "metaKeywords"],
  Project: [
    "title", "clientName", "summary", "challenge",
    "metaTitle", "metaDescription", "metaKeywords",
  ],
  Testimonial: ["quote", "company"],
  ClientLogo: ["name"],
  TeamMember: ["name", "role", "bio", "email"],
  Stat: ["label"],
  ProcessStep: ["title", "description"],
  Faq: ["question", "answer"],
  HeroSlide: ["eyebrow", "title", "subtitle", "ctaLabel", "altLabel"],
  Redirect: ["source", "destination"],
};

const quote = (value: string) => `'${value.replace(/'/g, "''")}'`;

/** Nested REPLACE() over one column, applying every pattern in order. */
function replaceExpr(column: string) {
  return REPLACEMENTS.reduce(
    (inner, [from, to]) => `REPLACE(${inner}, ${quote(from)}, ${quote(to)})`,
    `\`${column}\``,
  );
}


/** Rows in `table` where any target column still mentions the old brand. */
function matchCondition(columns: string[]) {
  return columns.map((c) => `\`${c}\` LIKE '%webeside%'`).join(" OR ");
}

async function main() {
  console.log(DRY_RUN ? "Dry run - nothing will be written.\n" : "Applying rebrand to the live database.\n");

  let total = 0;

  for (const [table, columns] of Object.entries(TARGETS)) {
    const where = matchCondition(columns);

    const [{ n }] = await prisma.$queryRawUnsafe<Array<{ n: bigint }>>(
      `SELECT COUNT(*) AS n FROM \`${table}\` WHERE ${where}`,
    );
    const matches = Number(n);

    if (!matches) {
      console.log(`  ${table.padEnd(18)} -`);
      continue;
    }

    if (DRY_RUN) {
      console.log(`  ${table.padEnd(18)} ${matches} row(s) would change`);
    } else {
      const sets = columns.map((c) => `\`${c}\` = ${replaceExpr(c)}`).join(", ");
      const updated = await prisma.$executeRawUnsafe(
        `UPDATE \`${table}\` SET ${sets} WHERE ${where}`,
      );
      console.log(`  ${table.padEnd(18)} ${updated} row(s) updated`);
    }

    total += matches;
  }

  console.log(
    `\n${total} row(s) ${DRY_RUN ? "would be" : ""} affected${DRY_RUN ? "." : " - done."}`,
  );

  if (!DRY_RUN && total) {
    console.log("Public pages revalidate within 5 minutes, or save any record in admin to flush sooner.");
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
