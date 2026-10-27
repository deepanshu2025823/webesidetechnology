import "server-only";
import { prisma } from "@/lib/prisma";
import { nextCode } from "@/lib/admin/sequence";
import { parseAmount, parseDate, parseEnum, pick } from "@/lib/admin/csv";
import type { ModuleKey } from "@/lib/permissions";
import { slugify } from "@/lib/utils";
import { parseVideo } from "@/lib/video";
import type { Prisma } from "@/generated/prisma/client";

/**
 * One registry describing every list in the panel that can be searched,
 * exported, imported and reported on.
 *
 * Each dataset owns its own filtering and its own columns, and the generic
 * toolbar, the CSV route, the importer and the printable report all read from
 * here. Adding those four capabilities to a new module is one entry in
 * `DATASETS`, not four features.
 */

export type Filters = {
  q?: string;
  status?: string;
  owner?: string;
  client?: string;
  from?: Date;
  to?: Date;
};

export type SummaryStat = { label: string; value: string };

export type ImportOutcome = {
  created: number;
  updated: number;
  skipped: number;
  /** Row-level problems, already prefixed with the row number. */
  errors: string[];
};

export type ImportField = { column: string; example: string; required?: boolean; note?: string };

export type Importer = {
  fields: ImportField[];
  run: (rows: Record<string, string>[], ctx: { userId: string }) => Promise<ImportOutcome>;
};

/** What the toolbar, the CSV route and the report page consume. */
export type Dataset = {
  key: string;
  label: string;
  description: string;
  module: ModuleKey;
  /** Placeholder for the search box; names the fields actually searched. */
  searchHint: string;
  /** Status chips offered by the toolbar, when the dataset has a status. */
  statuses?: { value: string; label: string }[];
  importer?: Importer;
  fetch: (filters: Filters) => Promise<{ headers: string[]; rows: string[][]; stats: SummaryStat[] }>;
};

// ------------------------------------------------------------------ helpers

const EXPORT_LIMIT = 5000;

function text(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (Array.isArray(value)) return value.join(", ");
  return String(value);
}

/** Enum member as a human would write it: ON_HOLD -> On hold. */
export function humanise(value: string) {
  if (!value) return "";
  const spaced = value.replace(/_/g, " ").toLowerCase();
  return spaced.charAt(0).toUpperCase() + spaced.slice(1);
}

function money(amount: number | null | undefined) {
  return typeof amount === "number" ? amount.toLocaleString("en-IN") : "";
}

function total(rows: { [k: string]: unknown }[], field: string) {
  return rows.reduce((sum, row) => sum + (Number(row[field]) || 0), 0);
}

/** Status chips from an enum, in schema order. */
function chips(values: readonly string[]) {
  return values.map((value) => ({ value, label: humanise(value) }));
}

/** Date window applied to whichever column the dataset treats as its date. */
function between(from?: Date, to?: Date) {
  if (!from && !to) return undefined;
  const end = to ? new Date(to) : undefined;
  if (end) end.setHours(23, 59, 59, 999);
  return { ...(from ? { gte: from } : {}), ...(end ? { lte: end } : {}) };
}

/**
 * Builds the dataset with its row type inferred from the query, then erases
 * that type at the boundary by pre-rendering every cell to a string. Callers
 * get one uniform shape; each definition below still gets full type checking
 * on its own accessors.
 */
function defineDataset<T>(spec: {
  key: string;
  label: string;
  description: string;
  module: ModuleKey;
  searchHint: string;
  statuses?: { value: string; label: string }[];
  importer?: Importer;
  query: (filters: Filters) => Promise<T[]>;
  columns: { label: string; value: (row: T) => unknown }[];
  stats?: (rows: T[]) => SummaryStat[];
}): Dataset {
  return {
    key: spec.key,
    label: spec.label,
    description: spec.description,
    module: spec.module,
    searchHint: spec.searchHint,
    statuses: spec.statuses,
    importer: spec.importer,
    async fetch(filters) {
      const rows = await spec.query(filters);
      return {
        headers: spec.columns.map((c) => c.label),
        rows: rows.map((row) => spec.columns.map((c) => text(c.value(row)))),
        stats: [{ label: "Records", value: String(rows.length) }, ...(spec.stats?.(rows) ?? [])],
      };
    },
  };
}

// ------------------------------------------------------------------ importers

/** Rows that carry no usable identity at all are skipped rather than failing. */
function blank(row: Record<string, string>) {
  return Object.values(row).every((value) => !value.trim());
}

const leadImporter: Importer = {
  fields: [
    { column: "Name", example: "Rohit Sharma", required: true },
    { column: "Email", example: "rohit@acme.in", required: true },
    { column: "Phone", example: "+91 98765 43210" },
    { column: "Company", example: "Acme Pvt Ltd" },
    { column: "Service Interest", example: "Web Development" },
    { column: "Budget", example: "₹2 – ₹5 lakh" },
    { column: "Message", example: "Need a new website" },
    { column: "Source", example: "referral", note: "Defaults to 'import'." },
    { column: "Status", example: "NEW", note: "NEW, CONTACTED, QUALIFIED, PROPOSAL, WON or LOST." },
  ],
  async run(rows) {
    const outcome: ImportOutcome = { created: 0, updated: 0, skipped: 0, errors: [] };
    const statuses = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"] as const;

    for (const [i, row] of rows.entries()) {
      const line = i + 2; // header is row 1
      if (blank(row)) {
        outcome.skipped += 1;
        continue;
      }

      const name = pick(row, "Name", "Lead", "Full Name", "Contact Name");
      const email = pick(row, "Email", "Email Address", "Mail").toLowerCase();

      if (!name) {
        outcome.errors.push(`Row ${line}: name is required.`);
        continue;
      }
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        outcome.errors.push(`Row ${line}: "${email || "(blank)"}" is not a valid email address.`);
        continue;
      }

      // The same person emailing twice should update, not duplicate.
      const existing = await prisma.enquiry.findFirst({ where: { email }, orderBy: { createdAt: "desc" } });
      const data = {
        name,
        email,
        phone: pick(row, "Phone", "Mobile", "Contact Number"),
        company: pick(row, "Company", "Organisation", "Organization", "Business"),
        serviceInterest: pick(row, "Service Interest", "Service", "Interest", "Requirement"),
        budget: pick(row, "Budget", "Budget Range"),
        message: pick(row, "Message", "Notes", "Remarks") || "Imported from a spreadsheet.",
        source: pick(row, "Source") || "import",
        status: parseEnum(pick(row, "Status", "Stage"), statuses, "NEW"),
      };

      try {
        if (existing) {
          await prisma.enquiry.update({ where: { id: existing.id }, data });
          outcome.updated += 1;
        } else {
          await prisma.enquiry.create({ data });
          outcome.created += 1;
        }
      } catch {
        outcome.errors.push(`Row ${line}: could not be saved.`);
      }
    }

    return outcome;
  },
};

const clientImporter: Importer = {
  fields: [
    { column: "Company Name", example: "Acme Pvt Ltd", required: true },
    { column: "Industry", example: "IT & Software" },
    { column: "Website", example: "https://acme.in" },
    { column: "GSTIN", example: "09AAACA1111A1Z5" },
    { column: "Status", example: "ACTIVE", note: "PROSPECT, ACTIVE, ON_HOLD or CHURNED." },
    { column: "Contact Name", example: "Rohit Sharma", note: "Creates the primary contact." },
    { column: "Contact Email", example: "rohit@acme.in" },
    { column: "Contact Phone", example: "+91 98765 43210" },
    { column: "City", example: "Noida" },
    { column: "State", example: "Uttar Pradesh" },
    { column: "Notes", example: "Referred by Sahil" },
  ],
  async run(rows) {
    const outcome: ImportOutcome = { created: 0, updated: 0, skipped: 0, errors: [] };
    const statuses = ["PROSPECT", "ACTIVE", "ON_HOLD", "CHURNED"] as const;

    for (const [i, row] of rows.entries()) {
      const line = i + 2;
      if (blank(row)) {
        outcome.skipped += 1;
        continue;
      }

      const name = pick(row, "Company Name", "Client", "Company", "Name", "Business Name");
      if (!name) {
        outcome.errors.push(`Row ${line}: company name is required.`);
        continue;
      }

      const data = {
        name,
        industry: pick(row, "Industry", "Sector"),
        website: pick(row, "Website", "Site", "URL"),
        gstin: pick(row, "GSTIN", "GST", "GST Number"),
        status: parseEnum(pick(row, "Status", "Relationship"), statuses, "PROSPECT"),
        addressLine: pick(row, "Address", "Street Address", "Address Line"),
        city: pick(row, "City"),
        state: pick(row, "State"),
        postalCode: pick(row, "PIN Code", "Postal Code", "Pincode", "Zip"),
        country: pick(row, "Country") || "India",
        notes: pick(row, "Notes", "Remarks") || null,
      };

      try {
        // Company names are the only stable identity in a spreadsheet.
        const existing = await prisma.client.findFirst({ where: { name } });
        const client = existing
          ? await prisma.client.update({ where: { id: existing.id }, data })
          : await prisma.client.create({ data: { ...data, code: await nextCode("client") } });

        if (existing) outcome.updated += 1;
        else outcome.created += 1;

        const contactName = pick(row, "Contact Name", "Primary Contact", "Contact Person");
        const contactEmail = pick(row, "Contact Email", "Email");
        if (contactName || contactEmail) {
          const already = await prisma.clientContact.findFirst({
            where: { clientId: client.id, ...(contactEmail ? { email: contactEmail } : { name: contactName }) },
          });
          if (!already) {
            const primaryExists = await prisma.clientContact.count({ where: { clientId: client.id, isPrimary: true } });
            await prisma.clientContact.create({
              data: {
                clientId: client.id,
                name: contactName || contactEmail,
                email: contactEmail,
                phone: pick(row, "Contact Phone", "Phone", "Mobile"),
                designation: pick(row, "Designation", "Role", "Title"),
                isPrimary: primaryExists === 0,
              },
            });
          }
        }
      } catch {
        outcome.errors.push(`Row ${line}: could not be saved.`);
      }
    }

    return outcome;
  },
};

const serviceImporter: Importer = {
  fields: [
    { column: "Title", example: "Web Development", required: true },
    { column: "Short Description", example: "Fast, SEO-ready websites." },
    { column: "Price From", example: "45000", note: "Whole rupees." },
    { column: "Price Unit", example: "project" },
    { column: "Status", example: "PUBLISHED", note: "DRAFT, PUBLISHED or ARCHIVED." },
    { column: "Featured", example: "Yes" },
  ],
  async run(rows) {
    const outcome: ImportOutcome = { created: 0, updated: 0, skipped: 0, errors: [] };
    const statuses = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

    for (const [i, row] of rows.entries()) {
      const line = i + 2;
      if (blank(row)) {
        outcome.skipped += 1;
        continue;
      }

      const title = pick(row, "Title", "Service", "Name");
      if (!title) {
        outcome.errors.push(`Row ${line}: title is required.`);
        continue;
      }

      const priceRaw = pick(row, "Price From", "Price", "Starting Price");
      const featured = pick(row, "Featured", "Is Featured");
      const data = {
        title,
        shortDescription: pick(row, "Short Description", "Description", "Summary"),
        priceFrom: priceRaw ? parseAmount(priceRaw) : null,
        priceUnit: pick(row, "Price Unit", "Unit") || "project",
        status: parseEnum(pick(row, "Status"), statuses, "DRAFT"),
        isFeatured: /^(yes|y|true|1)$/i.test(featured),
      };

      try {
        const slug = slugify(pick(row, "Slug") || title);
        const existing = await prisma.service.findUnique({ where: { slug } });
        if (existing) {
          await prisma.service.update({ where: { id: existing.id }, data });
          outcome.updated += 1;
        } else {
          // Columns without a schema default, left blank for editing later.
          await prisma.service.create({
            data: { ...data, slug, content: "", heroSubtitle: "", metaDescription: "", metaKeywords: "" },
          });
          outcome.created += 1;
        }
      } catch {
        outcome.errors.push(`Row ${line}: could not be saved.`);
      }
    }

    return outcome;
  },
};

/** "Leads: 3x; CPL: -40%" <-> [{ label, value }], the shape the case-study page draws. */
function parseResults(raw: string) {
  return raw
    .split(/[;\n]/)
    .map((part) => {
      const at = part.indexOf(":");
      return at === -1 ? null : { label: part.slice(0, at).trim(), value: part.slice(at + 1).trim() };
    })
    .filter((r): r is { label: string; value: string } => Boolean(r?.label && r.value));
}

function listOf(raw: string) {
  return raw
    .split(/[,;\n]/)
    .map((v) => v.trim())
    .filter(Boolean);
}

const projectImporter: Importer = {
  fields: [
    { column: "Title", example: "Meta Reel Ads for a real-estate developer", required: true },
    { column: "Slug", example: "meta-reel-ads-real-estate", note: "Matches an existing case study to update it. Made from the title when blank." },
    { column: "Client", example: "Furni Interiors" },
    { column: "Industry", example: "Real Estate & Construction" },
    { column: "Summary", example: "A year of Reel ads that kept cost per lead under ₹100." },
    { column: "Challenge", example: "Quality leads for a high-ticket business." },
    { column: "Solution", example: "Reel creatives, tight audiences, weekly optimisation." },
    { column: "Results", example: "Avg CPL: Under ₹100; Clients closed: 20+", note: "Label: value pairs separated by semicolons." },
    { column: "Technologies", example: "Meta Ads, Instagram Reels", note: "Comma separated." },
    { column: "Videos", example: "https://www.instagram.com/reel/…", note: "Video or reel links, separated by spaces or semicolons." },
    { column: "Cover Image", example: "https://…/cover.jpg", note: "A URL. Upload pictures from the edit screen." },
    { column: "Website", example: "https://example.com" },
    { column: "Delivered", example: "2026-05-01" },
    { column: "Status", example: "DRAFT", note: "DRAFT, PUBLISHED or ARCHIVED. Defaults to DRAFT." },
    { column: "Featured", example: "No" },
    { column: "Meta Title", example: "" },
    { column: "Meta Description", example: "" },
  ],
  async run(rows) {
    const outcome: ImportOutcome = { created: 0, updated: 0, skipped: 0, errors: [] };
    const statuses = ["DRAFT", "PUBLISHED", "ARCHIVED"] as const;

    for (const [i, row] of rows.entries()) {
      const line = i + 2;
      if (blank(row)) {
        outcome.skipped += 1;
        continue;
      }

      const title = pick(row, "Title", "Project", "Case Study", "Name");
      if (!title) {
        outcome.errors.push(`Row ${line}: title is required.`);
        continue;
      }

      const delivered = pick(row, "Delivered", "Completed", "Completed At", "Date");
      const completedAt = delivered ? parseDate(delivered) : null;
      if (delivered && !completedAt) {
        outcome.errors.push(`Row ${line}: "${delivered}" is not a date (use YYYY-MM-DD).`);
        continue;
      }

      // A blank cell leaves that field alone on an update, so re-importing a
      // trimmed sheet cannot wipe a case study's long-form copy.
      const optional = {
        clientName: pick(row, "Client", "Client Name"),
        industry: pick(row, "Industry"),
        summary: pick(row, "Summary"),
        challenge: pick(row, "Challenge"),
        solution: pick(row, "Solution"),
        websiteUrl: pick(row, "Website", "Website Url", "Url"),
        coverImage: pick(row, "Cover Image", "Cover", "Image"),
        metaTitle: pick(row, "Meta Title"),
        metaDescription: pick(row, "Meta Description"),
      };
      const filled = Object.fromEntries(Object.entries(optional).filter(([, v]) => v));
      const results = pick(row, "Results", "Outcomes");
      const technologies = pick(row, "Technologies", "Stack", "Channels");
      const videoLinks = pick(row, "Videos", "Video Links", "Reels")
        .split(/[\s;]+/)
        .filter((link) => parseVideo(link));
      const statusRaw = pick(row, "Status");
      const featured = pick(row, "Featured", "Is Featured");

      const data = {
        title,
        ...filled,
        ...(results ? { results: parseResults(results) } : {}),
        ...(technologies ? { technologies: listOf(technologies) } : {}),
        ...(videoLinks.length ? { videos: videoLinks } : {}),
        ...(completedAt ? { completedAt } : {}),
        ...(statusRaw ? { status: parseEnum(statusRaw, statuses, "DRAFT") } : {}),
        ...(featured ? { isFeatured: /^(yes|y|true|1)$/i.test(featured) } : {}),
      };

      try {
        const slug = slugify(pick(row, "Slug") || title);
        const existing = await prisma.project.findUnique({ where: { slug } });
        if (existing) {
          await prisma.project.update({ where: { id: existing.id }, data });
          outcome.updated += 1;
        } else {
          // New rows land as drafts unless the sheet says otherwise, so an
          // import never publishes half-written case studies by accident.
          await prisma.project.create({
            data: {
              summary: "",
              challenge: "",
              solution: "",
              metaDescription: "",
              metaKeywords: "",
              status: "DRAFT",
              ...data,
              slug,
            },
          });
          outcome.created += 1;
        }
      } catch {
        outcome.errors.push(`Row ${line}: could not be saved.`);
      }
    }

    return outcome;
  },
};

const subscriberImporter: Importer = {
  fields: [
    { column: "Email", example: "rohit@acme.in", required: true },
    { column: "Name", example: "Rohit Sharma" },
    { column: "Source", example: "event" },
  ],
  async run(rows) {
    const outcome: ImportOutcome = { created: 0, updated: 0, skipped: 0, errors: [] };

    for (const [i, row] of rows.entries()) {
      const line = i + 2;
      if (blank(row)) {
        outcome.skipped += 1;
        continue;
      }

      const email = pick(row, "Email", "Email Address").toLowerCase();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
        outcome.errors.push(`Row ${line}: "${email || "(blank)"}" is not a valid email address.`);
        continue;
      }

      try {
        const existing = await prisma.subscriber.findUnique({ where: { email } });
        if (existing) {
          outcome.skipped += 1;
          continue;
        }
        await prisma.subscriber.create({
          data: { email, name: pick(row, "Name"), source: pick(row, "Source") || "import" },
        });
        outcome.created += 1;
      } catch {
        outcome.errors.push(`Row ${line}: could not be saved.`);
      }
    }

    return outcome;
  },
};

const RENEWAL_TYPES = [
  "DOMAIN", "HOSTING", "SSL", "AMC", "SEO_RETAINER", "SOCIAL_RETAINER",
  "AD_MANAGEMENT", "API", "WHATSAPP", "SMS", "IVR", "OTHER",
] as const;

const RENEWAL_STATUSES = ["ACTIVE", "DUE", "RENEWED", "LOST", "CANCELLED"] as const;

/**
 * Renewals arrive as a spreadsheet from whoever held the domains and hosting
 * before, which is exactly the case this exists for.
 *
 * A renewal has to belong to a client, so the client column is matched by name
 * and a row naming someone not on the books is reported rather than quietly
 * attached to the wrong account or dropped. Re-importing the same sheet updates
 * the matching renewal instead of duplicating it — the identity being the
 * client plus the renewal's name.
 */
const renewalImporter: Importer = {
  fields: [
    { column: "Name", example: "sahabindia.com domain", required: true },
    { column: "Client", example: "Raas By Batra", required: true, note: "Must match a client already on the books." },
    { column: "Type", example: "DOMAIN", note: RENEWAL_TYPES.join(", ") },
    { column: "Provider", example: "GoDaddy" },
    { column: "Identifier", example: "sahabindia.com", note: "Domain, account or licence reference." },
    { column: "Expiry Date", example: "2027-03-31", required: true, note: "YYYY-MM-DD or DD/MM/YYYY." },
    { column: "Start Date", example: "2026-03-31" },
    { column: "Amount", example: "1200" },
    { column: "Status", example: "ACTIVE", note: RENEWAL_STATUSES.join(", ") },
    { column: "Notes", example: "Auto-renew is off at the registrar." },
  ],
  async run(rows) {
    const outcome: ImportOutcome = { created: 0, updated: 0, skipped: 0, errors: [] };

    // One read for the whole sheet; a lookup per row would be a query per line.
    const clients = await prisma.client.findMany({ select: { id: true, name: true } });
    const byName = new Map(clients.map((c) => [c.name.trim().toLowerCase(), c.id]));

    for (const [i, row] of rows.entries()) {
      const line = i + 2;
      if (blank(row)) {
        outcome.skipped += 1;
        continue;
      }

      const name = pick(row, "Name", "Renewal", "Service");
      if (!name) {
        outcome.errors.push(`Row ${line}: name is required.`);
        continue;
      }

      const clientName = pick(row, "Client", "Customer", "Account");
      const clientId = byName.get(clientName.trim().toLowerCase());
      if (!clientId) {
        outcome.errors.push(
          clientName
            ? `Row ${line}: no client called "${clientName}".`
            : `Row ${line}: client is required.`,
        );
        continue;
      }

      const expiryDate = parseDate(pick(row, "Expiry Date", "Expires", "Expiry", "Renewal Date"));
      if (!expiryDate) {
        outcome.errors.push(`Row ${line}: expiry date is required, as YYYY-MM-DD or DD/MM/YYYY.`);
        continue;
      }

      const data = {
        name,
        clientId,
        type: parseEnum(pick(row, "Type", "Kind"), RENEWAL_TYPES, "OTHER"),
        provider: pick(row, "Provider", "Vendor", "Registrar"),
        identifier: pick(row, "Identifier", "Domain", "Reference"),
        startDate: parseDate(pick(row, "Start Date", "Started", "From")),
        expiryDate,
        amount: parseAmount(pick(row, "Amount", "Cost", "Price")),
        status: parseEnum(pick(row, "Status"), RENEWAL_STATUSES, "ACTIVE"),
        notes: pick(row, "Notes", "Note", "Remarks") || null,
      };

      try {
        const existing = await prisma.renewal.findFirst({ where: { clientId, name } });
        if (existing) {
          await prisma.renewal.update({ where: { id: existing.id }, data });
          outcome.updated += 1;
        } else {
          await prisma.renewal.create({ data });
          outcome.created += 1;
        }
      } catch (error) {
        console.error("[import] renewal", error);
        outcome.errors.push(`Row ${line}: could not be saved.`);
      }
    }

    return outcome;
  },
};

const employeeImporter: Importer = {
  fields: [
    { column: "Name", example: "Anisha Verma", required: true },
    { column: "Email", example: "anisha@sahabindia.com" },
    { column: "Phone", example: "+91 98765 43210" },
    { column: "Department", example: "Design" },
    { column: "Designation", example: "Senior Designer" },
    { column: "Joined At", example: "2026-04-01", note: "YYYY-MM-DD or DD/MM/YYYY." },
    { column: "Employee Code", example: "EMP-0007", note: "Generated when blank." },
  ],
  async run(rows) {
    const outcome: ImportOutcome = { created: 0, updated: 0, skipped: 0, errors: [] };
    const count = await prisma.employee.count();
    let n = count;

    for (const [i, row] of rows.entries()) {
      const line = i + 2;
      if (blank(row)) {
        outcome.skipped += 1;
        continue;
      }

      const name = pick(row, "Name", "Employee", "Full Name");
      if (!name) {
        outcome.errors.push(`Row ${line}: name is required.`);
        continue;
      }

      const data = {
        name,
        email: pick(row, "Email", "Work Email"),
        phone: pick(row, "Phone", "Mobile"),
        department: pick(row, "Department", "Team"),
        designation: pick(row, "Designation", "Role", "Title"),
        joinedAt: parseDate(pick(row, "Joined At", "Joining Date", "Date Of Joining")),
      };

      try {
        const email = data.email;
        const existing = email ? await prisma.employee.findFirst({ where: { email } }) : null;
        if (existing) {
          await prisma.employee.update({ where: { id: existing.id }, data });
          outcome.updated += 1;
        } else {
          n += 1;
          const code = pick(row, "Employee Code", "Code") || `EMP-${String(n).padStart(4, "0")}`;
          await prisma.employee.create({ data: { ...data, code } });
          outcome.created += 1;
        }
      } catch {
        outcome.errors.push(`Row ${line}: could not be saved.`);
      }
    }

    return outcome;
  },
};

// ------------------------------------------------------------------ datasets

/** Case-insensitive "contains" across several columns. */
function search<T extends string>(q: string | undefined, fields: T[]) {
  if (!q?.trim()) return undefined;
  const contains = q.trim();
  return { OR: fields.map((field) => ({ [field]: { contains } })) } as Record<string, unknown>;
}

export const DATASETS: Record<string, Dataset> = {
  leads: defineDataset({
    key: "leads",
    label: "Leads",
    description: "Every enquiry and lead in the pipeline.",
    module: "leads",
    searchHint: "Search name, email, phone, company…",
    statuses: chips(["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"]),
    importer: leadImporter,
    query: (f) =>
      prisma.enquiry.findMany({
        where: {
          ...(f.status && f.status !== "ALL" ? { status: f.status as never } : {}),
          ...(f.owner ? { ownerId: f.owner } : {}),
          ...(search(f.q, ["name", "email", "phone", "company", "serviceInterest", "message"]) ?? {}),
          ...(between(f.from, f.to) ? { createdAt: between(f.from, f.to) } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: EXPORT_LIMIT,
        include: { owner: { select: { name: true } }, client: { select: { name: true } } },
      }),
    columns: [
      { label: "Name", value: (r) => r.name },
      { label: "Email", value: (r) => r.email },
      { label: "Phone", value: (r) => r.phone },
      { label: "Company", value: (r) => r.company },
      { label: "Service Interest", value: (r) => r.serviceInterest },
      { label: "Budget", value: (r) => r.budget },
      { label: "Status", value: (r) => humanise(r.status) },
      { label: "Score", value: (r) => r.score },
      { label: "Owner", value: (r) => r.owner?.name },
      { label: "Converted Client", value: (r) => r.client?.name },
      { label: "Next Follow-up", value: (r) => r.nextFollowUpAt },
      { label: "Source", value: (r) => r.source },
      { label: "Message", value: (r) => r.message },
      { label: "Received", value: (r) => r.createdAt },
    ],
    stats: (rows) => [
      { label: "Won", value: String(rows.filter((r) => r.status === "WON").length) },
      { label: "Open", value: String(rows.filter((r) => r.status !== "WON" && r.status !== "LOST").length) },
      { label: "Unread", value: String(rows.filter((r) => !r.isRead).length) },
    ],
  }),

  clients: defineDataset({
    key: "clients",
    label: "Clients",
    description: "Companies on the books, with their primary contact.",
    module: "clients",
    searchHint: "Search company, code, industry, city…",
    statuses: chips(["PROSPECT", "ACTIVE", "ON_HOLD", "CHURNED"]),
    importer: clientImporter,
    query: (f) =>
      prisma.client.findMany({
        where: {
          ...(f.status && f.status !== "ALL" ? { status: f.status as never } : {}),
          ...(f.owner ? { ownerId: f.owner } : {}),
          ...(search(f.q, ["name", "code", "industry", "city", "gstin", "website"]) ?? {}),
          ...(between(f.from, f.to) ? { createdAt: between(f.from, f.to) } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: EXPORT_LIMIT,
        include: {
          owner: { select: { name: true } },
          contacts: { where: { isPrimary: true }, take: 1 },
          _count: { select: { projects: true, quotations: true, invoices: true } },
        },
      }),
    columns: [
      { label: "Code", value: (r) => r.code },
      { label: "Company Name", value: (r) => r.name },
      { label: "Industry", value: (r) => r.industry },
      { label: "Status", value: (r) => humanise(r.status) },
      { label: "Contact Name", value: (r) => r.contacts[0]?.name },
      { label: "Contact Email", value: (r) => r.contacts[0]?.email },
      { label: "Contact Phone", value: (r) => r.contacts[0]?.phone },
      { label: "Website", value: (r) => r.website },
      { label: "GSTIN", value: (r) => r.gstin },
      { label: "City", value: (r) => r.city },
      { label: "State", value: (r) => r.state },
      { label: "Account Manager", value: (r) => r.owner?.name },
      { label: "Health Score", value: (r) => r.healthScore },
      { label: "Projects", value: (r) => r._count.projects },
      { label: "Quotations", value: (r) => r._count.quotations },
      { label: "Added", value: (r) => r.createdAt },
    ],
    stats: (rows) => [
      { label: "Active", value: String(rows.filter((r) => r.status === "ACTIVE").length) },
      { label: "Prospects", value: String(rows.filter((r) => r.status === "PROSPECT").length) },
    ],
  }),

  quotations: defineDataset({
    key: "quotations",
    label: "Quotations",
    description: "Proposals sent, accepted and lost.",
    module: "quotations",
    searchHint: "Search number, title, client…",
    statuses: chips(["DRAFT", "SENT", "NEGOTIATION", "ACCEPTED", "REJECTED", "EXPIRED"]),
    query: (f) =>
      prisma.quotation.findMany({
        where: {
          ...(f.status && f.status !== "ALL" ? { status: f.status as never } : {}),
          ...(f.client ? { clientId: f.client } : {}),
          ...(f.q?.trim()
            ? {
                OR: [
                  { number: { contains: f.q.trim() } },
                  { title: { contains: f.q.trim() } },
                  { client: { name: { contains: f.q.trim() } } },
                ],
              }
            : {}),
          ...(between(f.from, f.to) ? { createdAt: between(f.from, f.to) } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: EXPORT_LIMIT,
        include: { client: { select: { name: true } }, owner: { select: { name: true } } },
      }),
    columns: [
      { label: "Number", value: (r) => r.number },
      { label: "Title", value: (r) => r.title },
      { label: "Client", value: (r) => r.client.name },
      { label: "Status", value: (r) => humanise(r.status) },
      { label: "Commercial", value: (r) => humanise(r.commercial) },
      { label: "Subtotal", value: (r) => money(r.subtotal) },
      { label: "Discount %", value: (r) => r.discountPct },
      { label: "Tax %", value: (r) => r.taxPct },
      { label: "Total", value: (r) => money(r.total) },
      { label: "Valid Until", value: (r) => r.validUntil },
      { label: "Owner", value: (r) => r.owner?.name },
      { label: "Sent", value: (r) => r.sentAt },
      { label: "Created", value: (r) => r.createdAt },
    ],
    stats: (rows) => [
      { label: "Total value", value: `₹${money(total(rows, "total"))}` },
      {
        label: "Accepted value",
        value: `₹${money(rows.filter((r) => r.status === "ACCEPTED").reduce((s, r) => s + r.total, 0))}`,
      },
    ],
  }),

  "client-projects": defineDataset({
    key: "client-projects",
    label: "Projects",
    description: "Delivery pipeline across every client.",
    module: "projects",
    searchHint: "Search project, code, client…",
    statuses: chips(["DRAFT", "PLANNED", "ACTIVE", "ON_HOLD", "COMPLETED", "CANCELLED"]),
    query: (f) =>
      prisma.clientProject.findMany({
        where: {
          ...(f.status && f.status !== "ALL" ? { stage: f.status as never } : {}),
          ...(f.client ? { clientId: f.client } : {}),
          ...(f.owner ? { managerId: f.owner } : {}),
          ...(f.q?.trim()
            ? {
                OR: [
                  { name: { contains: f.q.trim() } },
                  { code: { contains: f.q.trim() } },
                  { client: { name: { contains: f.q.trim() } } },
                ],
              }
            : {}),
          ...(between(f.from, f.to) ? { createdAt: between(f.from, f.to) } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: EXPORT_LIMIT,
        include: {
          client: { select: { name: true } },
          manager: { select: { name: true } },
          service: { select: { title: true } },
          _count: { select: { tasks: true, milestones: true } },
        },
      }),
    columns: [
      { label: "Code", value: (r) => r.code },
      { label: "Project", value: (r) => r.name },
      { label: "Client", value: (r) => r.client.name },
      { label: "Service", value: (r) => r.service?.title },
      { label: "Stage", value: (r) => humanise(r.stage) },
      { label: "Health", value: (r) => humanise(r.health) },
      { label: "Commercial", value: (r) => humanise(r.commercial) },
      { label: "Budget", value: (r) => money(r.budget) },
      { label: "Manager", value: (r) => r.manager?.name },
      { label: "Start Date", value: (r) => r.startDate },
      { label: "End Date", value: (r) => r.endDate },
      { label: "Tasks", value: (r) => r._count.tasks },
      { label: "Milestones", value: (r) => r._count.milestones },
    ],
    stats: (rows) => [
      { label: "Active", value: String(rows.filter((r) => r.stage === "ACTIVE").length) },
      { label: "Budget", value: `₹${money(total(rows, "budget"))}` },
      { label: "At risk", value: String(rows.filter((r) => r.health !== "ON_TRACK").length) },
    ],
  }),

  tasks: defineDataset({
    key: "tasks",
    label: "Tasks",
    description: "Work items across every project.",
    module: "tasks",
    searchHint: "Search task, project…",
    statuses: chips(["TODO", "ASSIGNED", "IN_PROGRESS", "REVIEW", "CLIENT_APPROVAL", "REVISION", "DONE"]),
    query: (f) =>
      prisma.task.findMany({
        where: {
          ...(f.status && f.status !== "ALL" ? { status: f.status as never } : {}),
          ...(f.owner ? { assigneeId: f.owner } : {}),
          ...(f.q?.trim()
            ? {
                OR: [
                  { title: { contains: f.q.trim() } },
                  { description: { contains: f.q.trim() } },
                  { project: { name: { contains: f.q.trim() } } },
                ],
              }
            : {}),
          ...(between(f.from, f.to) ? { dueDate: between(f.from, f.to) } : {}),
        },
        orderBy: [{ dueDate: "asc" }, { createdAt: "desc" }],
        take: EXPORT_LIMIT,
        include: {
          project: { select: { name: true, client: { select: { name: true } } } },
          assignee: { select: { name: true } },
        },
      }),
    columns: [
      { label: "Task", value: (r) => r.title },
      { label: "Project", value: (r) => r.project.name },
      { label: "Client", value: (r) => r.project.client.name },
      { label: "Status", value: (r) => humanise(r.status) },
      { label: "Priority", value: (r) => humanise(r.priority) },
      { label: "Assignee", value: (r) => r.assignee?.name },
      { label: "Due Date", value: (r) => r.dueDate },
      { label: "Estimate (hrs)", value: (r) => r.estimateHours },
      { label: "Completed", value: (r) => r.completedAt },
    ],
    stats: (rows) => {
      const now = Date.now();
      return [
        { label: "Done", value: String(rows.filter((r) => r.status === "DONE").length) },
        {
          label: "Overdue",
          value: String(rows.filter((r) => r.status !== "DONE" && r.dueDate && r.dueDate.getTime() < now).length),
        },
      ];
    },
  }),

  invoices: defineDataset({
    key: "invoices",
    label: "Invoices",
    description: "Billing, collections and outstanding balances.",
    module: "finance",
    searchHint: "Search number, title, client…",
    statuses: chips(["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"]),
    query: (f) =>
      prisma.invoice.findMany({
        where: {
          ...(f.status && f.status !== "ALL" ? { status: f.status as never } : {}),
          ...(f.client ? { clientId: f.client } : {}),
          ...(f.q?.trim()
            ? {
                OR: [
                  { number: { contains: f.q.trim() } },
                  { title: { contains: f.q.trim() } },
                  { client: { name: { contains: f.q.trim() } } },
                ],
              }
            : {}),
          ...(between(f.from, f.to) ? { issueDate: between(f.from, f.to) } : {}),
        },
        orderBy: { issueDate: "desc" },
        take: EXPORT_LIMIT,
        include: { client: { select: { name: true } }, project: { select: { name: true } } },
      }),
    columns: [
      { label: "Number", value: (r) => r.number },
      { label: "Title", value: (r) => r.title },
      { label: "Client", value: (r) => r.client.name },
      { label: "Project", value: (r) => r.project?.name },
      { label: "Kind", value: (r) => humanise(r.kind) },
      { label: "Status", value: (r) => humanise(r.status) },
      { label: "Issue Date", value: (r) => r.issueDate },
      { label: "Due Date", value: (r) => r.dueDate },
      { label: "Subtotal", value: (r) => money(r.subtotal) },
      { label: "Tax %", value: (r) => r.taxPct },
      { label: "Total", value: (r) => money(r.total) },
      { label: "Paid", value: (r) => money(r.amountPaid) },
      { label: "Outstanding", value: (r) => money(r.total - r.amountPaid) },
    ],
    stats: (rows) => [
      { label: "Invoiced", value: `₹${money(total(rows, "total"))}` },
      { label: "Collected", value: `₹${money(total(rows, "amountPaid"))}` },
      { label: "Outstanding", value: `₹${money(total(rows, "total") - total(rows, "amountPaid"))}` },
    ],
  }),

  payments: defineDataset({
    key: "payments",
    label: "Payments",
    description: "Money received, by invoice and mode.",
    module: "finance",
    searchHint: "Search reference, client, invoice…",
    query: (f) =>
      prisma.payment.findMany({
        where: {
          ...(f.client ? { clientId: f.client } : {}),
          ...(f.q?.trim()
            ? {
                OR: [
                  { reference: { contains: f.q.trim() } },
                  { client: { name: { contains: f.q.trim() } } },
                  { invoice: { number: { contains: f.q.trim() } } },
                ],
              }
            : {}),
          ...(between(f.from, f.to) ? { paidAt: between(f.from, f.to) } : {}),
        },
        orderBy: { paidAt: "desc" },
        take: EXPORT_LIMIT,
        include: {
          client: { select: { name: true } },
          invoice: { select: { number: true } },
          recordedBy: { select: { name: true } },
        },
      }),
    columns: [
      { label: "Paid On", value: (r) => r.paidAt },
      { label: "Client", value: (r) => r.client.name },
      { label: "Invoice", value: (r) => r.invoice.number },
      { label: "Amount", value: (r) => money(r.amount) },
      { label: "Mode", value: (r) => humanise(r.mode) },
      { label: "Reference", value: (r) => r.reference },
      { label: "Recorded By", value: (r) => r.recordedBy?.name },
      { label: "Notes", value: (r) => r.notes },
    ],
    stats: (rows) => [{ label: "Received", value: `₹${money(total(rows, "amount"))}` }],
  }),

  expenses: defineDataset({
    key: "expenses",
    label: "Income & expenses",
    description: "Every entry in the money register, by category, party and project.",
    module: "finance",
    searchHint: "Search title, party, category…",
    statuses: chips(["INCOME", "EXPENSE"]),
    query: (f) =>
      prisma.expense.findMany({
        where: {
          ...(f.status && f.status !== "ALL" ? { direction: f.status as never } : {}),
          ...(f.client ? { clientId: f.client } : {}),
          ...(search(f.q, ["title", "vendor", "category", "reference", "notes"]) ?? {}),
          ...(between(f.from, f.to) ? { spentAt: between(f.from, f.to) } : {}),
        },
        orderBy: { spentAt: "desc" },
        take: EXPORT_LIMIT,
        include: {
          client: { select: { name: true } },
          project: { select: { name: true } },
          recordedBy: { select: { name: true } },
        },
      }),
    columns: [
      { label: "Date", value: (r) => r.spentAt },
      { label: "Type", value: (r) => (r.direction === "INCOME" ? "Income" : "Expense") },
      { label: "Title", value: (r) => r.title },
      { label: "Category", value: (r) => r.category },
      { label: "Party", value: (r) => r.vendor },
      { label: "Amount", value: (r) => money(r.amount) },
      { label: "Settled", value: (r) => (r.isSettled ? "Yes" : "No") },
      { label: "Due", value: (r) => r.dueDate },
      { label: "Mode", value: (r) => r.paymentMode },
      { label: "Reference", value: (r) => r.reference },
      { label: "Client", value: (r) => r.client?.name },
      { label: "Project", value: (r) => r.project?.name },
      { label: "Recorded By", value: (r) => r.recordedBy?.name },
      { label: "Notes", value: (r) => r.notes },
    ],
    stats: (rows) => {
      const settled = rows.filter((r) => r.isSettled);
      const income = total(settled.filter((r) => r.direction === "INCOME"), "amount");
      const spend = total(settled.filter((r) => r.direction === "EXPENSE"), "amount");
      return [
        { label: "Income", value: `₹${money(income)}` },
        { label: "Spend", value: `₹${money(spend)}` },
        { label: "Net", value: `₹${money(income - spend)}` },
      ];
    },
  }),

  renewals: defineDataset({
    key: "renewals",
    label: "Renewals",
    description: "Domains, hosting, retainers and everything that expires.",
    module: "renewals",
    importer: renewalImporter,
    searchHint: "Search name, provider, client…",
    statuses: chips(["ACTIVE", "DUE", "RENEWED", "LOST", "CANCELLED"]),
    query: (f) =>
      prisma.renewal.findMany({
        where: {
          ...(f.status && f.status !== "ALL" ? { status: f.status as never } : {}),
          ...(f.client ? { clientId: f.client } : {}),
          ...(f.q?.trim()
            ? {
                OR: [
                  { name: { contains: f.q.trim() } },
                  { provider: { contains: f.q.trim() } },
                  { identifier: { contains: f.q.trim() } },
                  { client: { name: { contains: f.q.trim() } } },
                ],
              }
            : {}),
          ...(between(f.from, f.to) ? { expiryDate: between(f.from, f.to) } : {}),
        },
        orderBy: { expiryDate: "asc" },
        take: EXPORT_LIMIT,
        include: { client: { select: { name: true } }, owner: { select: { name: true } } },
      }),
    columns: [
      { label: "Name", value: (r) => r.name },
      { label: "Type", value: (r) => humanise(r.type) },
      { label: "Client", value: (r) => r.client.name },
      { label: "Provider", value: (r) => r.provider },
      { label: "Identifier", value: (r) => r.identifier },
      { label: "Expiry Date", value: (r) => r.expiryDate },
      { label: "Amount", value: (r) => money(r.amount) },
      { label: "Status", value: (r) => humanise(r.status) },
      { label: "Auto Remind", value: (r) => r.autoRemind },
      { label: "Owner", value: (r) => r.owner?.name },
      { label: "Balance", value: (r) => money(r.balance) },
    ],
    stats: (rows) => {
      const soon = Date.now() + 30 * 86_400_000;
      return [
        { label: "Due in 30 days", value: String(rows.filter((r) => r.expiryDate.getTime() <= soon).length) },
        { label: "Renewal value", value: `₹${money(total(rows, "amount"))}` },
      ];
    },
  }),

  services: defineDataset({
    key: "services",
    label: "Services",
    description: "The service catalogue shown on the website.",
    module: "website",
    searchHint: "Search title, description…",
    statuses: chips(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    importer: serviceImporter,
    query: (f) =>
      prisma.service.findMany({
        where: {
          ...(f.status && f.status !== "ALL" ? { status: f.status as never } : {}),
          ...(search(f.q, ["title", "shortDescription", "slug"]) ?? {}),
        },
        orderBy: { order: "asc" },
        take: EXPORT_LIMIT,
        include: { category: { select: { name: true } } },
      }),
    columns: [
      { label: "Title", value: (r) => r.title },
      { label: "Slug", value: (r) => r.slug },
      { label: "Category", value: (r) => r.category?.name },
      { label: "Short Description", value: (r) => r.shortDescription },
      { label: "Price From", value: (r) => money(r.priceFrom) },
      { label: "Price Unit", value: (r) => r.priceUnit },
      { label: "Status", value: (r) => humanise(r.status) },
      { label: "Featured", value: (r) => r.isFeatured },
    ],
    stats: (rows) => [{ label: "Published", value: String(rows.filter((r) => r.status === "PUBLISHED").length) }],
  }),

  projects: defineDataset({
    key: "projects",
    label: "Portfolio",
    description: "Case studies shown on the portfolio page.",
    module: "website",
    searchHint: "Search title, client, industry…",
    statuses: chips(["DRAFT", "PUBLISHED", "ARCHIVED"]),
    importer: projectImporter,
    query: (f) =>
      prisma.project.findMany({
        where: {
          ...(f.status && f.status !== "ALL" ? { status: f.status as never } : {}),
          ...(search(f.q, ["title", "clientName", "industry", "slug", "summary"]) ?? {}),
        },
        orderBy: [{ order: "asc" }, { createdAt: "desc" }],
        take: EXPORT_LIMIT,
      }),
    // Same headings the importer reads, so an export edits and re-imports as is.
    columns: [
      { label: "Title", value: (r) => r.title },
      { label: "Slug", value: (r) => r.slug },
      { label: "Client", value: (r) => r.clientName },
      { label: "Industry", value: (r) => r.industry },
      { label: "Summary", value: (r) => r.summary },
      { label: "Challenge", value: (r) => r.challenge },
      { label: "Solution", value: (r) => r.solution },
      {
        label: "Results",
        value: (r) =>
          (Array.isArray(r.results) ? (r.results as { label?: string; value?: string }[]) : [])
            .map((x) => `${x.label ?? ""}: ${x.value ?? ""}`)
            .join("; "),
      },
      { label: "Technologies", value: (r) => (Array.isArray(r.technologies) ? (r.technologies as string[]) : []) },
      { label: "Videos", value: (r) => (Array.isArray(r.videos) ? (r.videos as string[]).join("; ") : "") },
      { label: "Cover Image", value: (r) => r.coverImage },
      { label: "Website", value: (r) => r.websiteUrl },
      { label: "Delivered", value: (r) => r.completedAt },
      { label: "Status", value: (r) => r.status },
      { label: "Featured", value: (r) => r.isFeatured },
      { label: "Meta Title", value: (r) => r.metaTitle },
      { label: "Meta Description", value: (r) => r.metaDescription },
    ],
    stats: (rows) => [
      { label: "Published", value: String(rows.filter((r) => r.status === "PUBLISHED").length) },
      { label: "Featured", value: String(rows.filter((r) => r.isFeatured).length) },
    ],
  }),

  subscribers: defineDataset({
    key: "subscribers",
    label: "Subscribers",
    description: "Newsletter list.",
    module: "website",
    searchHint: "Search email, name…",
    importer: subscriberImporter,
    query: (f) =>
      prisma.subscriber.findMany({
        where: {
          ...(search(f.q, ["email", "name", "source"]) ?? {}),
          ...(between(f.from, f.to) ? { createdAt: between(f.from, f.to) } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: EXPORT_LIMIT,
      }),
    columns: [
      { label: "Email", value: (r) => r.email },
      { label: "Name", value: (r) => r.name },
      { label: "Source", value: (r) => r.source },
      { label: "Active", value: (r) => r.isActive },
      { label: "Subscribed", value: (r) => r.createdAt },
    ],
  }),

  employees: defineDataset({
    key: "employees",
    label: "Employees",
    description: "The team directory.",
    module: "team",
    searchHint: "Search name, email, department…",
    importer: employeeImporter,
    query: (f) =>
      prisma.employee.findMany({
        where: search(f.q, ["name", "email", "phone", "department", "designation", "code"]) ?? {},
        orderBy: { name: "asc" },
        take: EXPORT_LIMIT,
      }),
    columns: [
      { label: "Employee Code", value: (r) => r.code },
      { label: "Name", value: (r) => r.name },
      { label: "Email", value: (r) => r.email },
      { label: "Phone", value: (r) => r.phone },
      { label: "Department", value: (r) => r.department },
      { label: "Designation", value: (r) => r.designation },
      { label: "Joined At", value: (r) => r.joinedAt },
      { label: "Active", value: (r) => r.isActive },
    ],
    stats: (rows) => [{ label: "Active", value: String(rows.filter((r) => r.isActive).length) }],
  }),

  "leave-requests": defineDataset({
    key: "leave-requests",
    label: "Leave requests",
    description: "Applications and their decisions.",
    module: "team",
    searchHint: "Search employee, reason…",
    statuses: chips(["REQUESTED", "APPROVED", "REJECTED"]),
    query: (f) =>
      prisma.leaveRequest.findMany({
        where: {
          ...(f.status && f.status !== "ALL" ? { status: f.status as never } : {}),
          ...(f.q?.trim()
            ? { OR: [{ reason: { contains: f.q.trim() } }, { employee: { name: { contains: f.q.trim() } } }] }
            : {}),
          ...(between(f.from, f.to) ? { fromDate: between(f.from, f.to) } : {}),
        },
        orderBy: { createdAt: "desc" },
        take: EXPORT_LIMIT,
        include: { employee: { select: { name: true, department: true } }, decidedBy: { select: { name: true } } },
      }),
    columns: [
      { label: "Employee", value: (r) => r.employee.name },
      { label: "Department", value: (r) => r.employee.department },
      { label: "Type", value: (r) => humanise(r.type) },
      { label: "From", value: (r) => r.fromDate },
      { label: "To", value: (r) => r.toDate },
      { label: "Days", value: (r) => r.days },
      { label: "Status", value: (r) => humanise(r.status) },
      { label: "Reason", value: (r) => r.reason },
      { label: "Decided By", value: (r) => r.decidedBy?.name },
      { label: "Applied", value: (r) => r.createdAt },
    ],
    stats: (rows) => [
      { label: "Pending", value: String(rows.filter((r) => r.status === "REQUESTED").length) },
      { label: "Days requested", value: String(total(rows, "days")) },
    ],
  }),
};

export function getDataset(key: string): Dataset | undefined {
  return DATASETS[key];
}

/** Read the filter set the toolbar puts in the URL. */
export function readFilters(params: URLSearchParams | Record<string, string | undefined>): Filters {
  const get = (key: string) =>
    params instanceof URLSearchParams ? (params.get(key) ?? undefined) : params[key];

  const from = get("from");
  const to = get("to");

  return {
    q: get("q") || undefined,
    status: get("status") || undefined,
    owner: get("owner") || undefined,
    client: get("client") || undefined,
    from: from ? (parseDate(from) ?? undefined) : undefined,
    to: to ? (parseDate(to) ?? undefined) : undefined,
  };
}

/** Prisma `where` for a text search, exposed so list pages reuse the same rule. */
export function searchWhere(q: string | undefined, fields: string[]): Prisma.InputJsonValue | undefined {
  return search(q, fields) as Prisma.InputJsonValue | undefined;
}
