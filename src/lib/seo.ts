import "server-only";
import type { Metadata } from "next";
import { getSettings } from "@/lib/queries";
import { absoluteUrl, excerptFrom } from "@/lib/utils";

type SeoInput = {
  title?: string | null;
  description?: string | null;
  keywords?: string | null;
  path?: string;
  image?: string | null;
  type?: "website" | "article";
  publishedTime?: Date | string | null;
  modifiedTime?: Date | string | null;
  noIndex?: boolean;
};

/** Builds page metadata, falling back to the site-wide defaults saved in admin. */
export async function buildMetadata(input: SeoInput = {}): Promise<Metadata> {
  const settings = await getSettings();

  const siteName = settings.siteName || "Sahab India";

  // Titles are built here rather than through Next's `%s` template so a page
  // whose meta title already names the brand is not suffixed twice.
  const raw = input.title?.trim() || settings.metaTitle || `${siteName} — ${settings.tagline}`;
  // The brand suffix goes only where it fits: search results cut titles at
  // about 60 characters, and audit tools flag anything past 70. A long page
  // title keeps its own words rather than losing them to the suffix.
  const branded = `${raw} | ${siteName}`;
  const title = raw.toLowerCase().includes(siteName.toLowerCase()) || branded.length > 60 ? raw : branded;
  const description =
    input.description?.trim() || settings.metaDescription || excerptFrom(settings.description || "", 160);
  const keywords = (input.keywords || settings.metaKeywords || "")
    .split(",")
    .map((k) => k.trim())
    .filter(Boolean);
  const url = absoluteUrl(input.path ?? "/");
  const image = absoluteUrl(input.image || settings.ogImage || "/brand/og-default.png");
  const indexable = settings.robotsIndexable && !input.noIndex;

  return {
    title: { absolute: title },
    description,
    keywords: keywords.length ? keywords : undefined,
    alternates: { canonical: url },
    robots: indexable
      ? { index: true, follow: true, "max-image-preview": "large", "max-snippet": -1 }
      : { index: false, follow: false },
    openGraph: {
      type: input.type ?? "website",
      siteName,
      title,
      description,
      url,
      images: [{ url: image, width: 1200, height: 630, alt: siteName }],
      locale: "en_IN",
      ...(input.publishedTime ? { publishedTime: new Date(input.publishedTime).toISOString() } : {}),
      ...(input.modifiedTime ? { modifiedTime: new Date(input.modifiedTime).toISOString() } : {}),
    },
    twitter: {
      card: "summary_large_image",
      title,
      description,
      images: [image],
    },
  };
}

/** Organization + WebSite JSON-LD injected once, in the root layout. */
/**
 * Local-business types (LocalBusiness, ProfessionalService and the like) are
 * only valid with a street address; without one every page carried an invalid
 * structured-data item. Until Settings has an address line, the plain
 * Organization type is used instead, which needs none.
 */
const NEEDS_ADDRESS = new Set(["LocalBusiness", "ProfessionalService", "Store", "HomeAndConstructionBusiness"]);

export async function organizationJsonLd() {
  const s = await getSettings();
  const sameAs = [s.facebook, s.instagram, s.linkedin, s.twitter, s.youtube].filter(Boolean);
  const chosen = s.schemaOrgType || "Organization";
  const type = NEEDS_ADDRESS.has(chosen) && !s.addressLine ? "Organization" : chosen;

  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": type,
        "@id": absoluteUrl("/#organization"),
        name: s.siteName,
        url: absoluteUrl("/"),
        logo: absoluteUrl(s.logoLight),
        image: absoluteUrl(s.ogImage),
        description: s.description,
        ...(s.foundingYear ? { foundingDate: s.foundingYear } : {}),
        ...(sameAs.length ? { sameAs } : {}),
        ...(s.email || s.phone
          ? {
              contactPoint: [
                {
                  "@type": "ContactPoint",
                  contactType: "sales",
                  ...(s.email ? { email: s.email } : {}),
                  ...(s.phone ? { telephone: s.phone } : {}),
                  areaServed: s.country || "IN",
                  availableLanguage: ["en", "hi"],
                },
              ],
            }
          : {}),
        ...(s.addressLine
          ? {
              address: {
                "@type": "PostalAddress",
                streetAddress: s.addressLine,
                addressLocality: s.city,
                addressRegion: s.state,
                postalCode: s.postalCode,
                addressCountry: s.country,
              },
            }
          : {}),
      },
      {
        "@type": "WebSite",
        "@id": absoluteUrl("/#website"),
        url: absoluteUrl("/"),
        name: s.siteName,
        publisher: { "@id": absoluteUrl("/#organization") },
        potentialAction: {
          "@type": "SearchAction",
          target: { "@type": "EntryPoint", urlTemplate: absoluteUrl("/blog?q={search_term_string}") },
          "query-input": "required name=search_term_string",
        },
      },
    ],
  };
}

export function breadcrumbJsonLd(trail: Array<{ name: string; path: string }>) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: trail.map((item, i) => ({
      "@type": "ListItem",
      position: i + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}
