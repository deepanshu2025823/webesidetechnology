/**
 * The home page's bands, in the order they ship.
 *
 * This list is the contract between the page and the admin panel: an editor can
 * reorder, hide and space these, but cannot invent one, because every key here
 * has to map to something the page knows how to draw. A row in the database
 * whose key is not listed is ignored rather than crashing the page, which is
 * what makes removing a section from the code safe.
 */

export type SectionSpacing = "NONE" | "COMPACT" | "NORMAL" | "ROOMY";

export type HomeSectionKey =
  | "hero"
  | "logos"
  | "brand"
  | "videos"
  | "services"
  | "why"
  | "process"
  | "portfolio"
  | "testimonials"
  | "blog"
  | "faq"
  | "cta";

export type SectionDefinition = {
  key: HomeSectionKey;
  label: string;
  /** What an editor needs to know before hiding or moving it. */
  note: string;
};

export const HOME_SECTIONS: SectionDefinition[] = [
  { key: "hero", label: "Hero slides", note: "The rotating headline block at the top." },
  { key: "logos", label: "Client logos", note: "The scrolling strip of client marks." },
  { key: "brand", label: "Brand philosophy", note: "The illustrated BRAND headline." },
  { key: "videos", label: "Showreel", note: "The video strip. Also has its own on/off switch in Settings." },
  { key: "services", label: "Services", note: "Featured services. Hidden automatically when none are featured." },
  { key: "why", label: "Why us", note: "The brand panel, the promises beside it and its button." },
  { key: "process", label: "Process steps", note: "The 'how we work' timeline." },
  { key: "portfolio", label: "Case studies", note: "Featured case studies." },
  { key: "testimonials", label: "Testimonials", note: "Client quotes on the dark band." },
  { key: "blog", label: "Latest writing", note: "The three most recent published posts." },
  { key: "faq", label: "FAQs", note: "General questions, and the FAQ structured data." },
  { key: "cta", label: "Closing call to action", note: "The gold band above the footer." },
];

const KEYS = new Set<string>(HOME_SECTIONS.map((s) => s.key));

export function isHomeSectionKey(key: string): key is HomeSectionKey {
  return KEYS.has(key);
}

/** Vertical breathing room, as the four choices an editor sees. */
export const SPACING_CLASS: Record<SectionSpacing, string> = {
  NONE: "py-0",
  COMPACT: "py-10 sm:py-12",
  NORMAL: "py-20 sm:py-24",
  ROOMY: "py-28 sm:py-36",
};

export const SPACING_OPTIONS: { value: SectionSpacing; label: string }[] = [
  { value: "NONE", label: "None — flush against the next section" },
  { value: "COMPACT", label: "Compact" },
  { value: "NORMAL", label: "Normal (default)" },
  { value: "ROOMY", label: "Roomy" },
];

export type ResolvedSection = {
  key: HomeSectionKey;
  label: string;
  isActive: boolean;
  spacing: SectionSpacing;
};

/**
 * Merges the saved rows onto the shipped list.
 *
 * Anything the editor has not touched keeps its default position, so adding a
 * section in code does not require a database edit before it appears — it lands
 * at its declared place with normal spacing, visible.
 */
export function resolveSections(
  rows: { key: string; isActive: boolean; order: number; spacing: string }[],
): ResolvedSection[] {
  const saved = new Map(rows.filter((r) => isHomeSectionKey(r.key)).map((r) => [r.key, r]));

  return HOME_SECTIONS.map((definition, index) => {
    const row = saved.get(definition.key);
    return {
      key: definition.key,
      label: definition.label,
      isActive: row?.isActive ?? true,
      spacing: (row?.spacing as SectionSpacing) ?? "NORMAL",
      order: row?.order ?? index,
    };
  })
    .sort((a, b) => a.order - b.order)
    .map(({ key, label, isActive, spacing }) => ({ key, label, isActive, spacing }));
}
