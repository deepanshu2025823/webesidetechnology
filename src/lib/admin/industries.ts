/**
 * Industries offered in the client form's dropdown.
 *
 * This is a starting list, not a closed one — the form also offers "Add another
 * industry", and anything typed there is merged back into the options the next
 * time the form loads (see `industryOptions`). So the list grows with the
 * agency's actual book of business rather than needing a code change.
 */
export const INDUSTRIES = [
  "Advertising & Marketing",
  "Agriculture",
  "Architecture & Interior",
  "Automobile",
  "Aviation & Travel",
  "Banking & Finance",
  "Beauty & Wellness",
  "Construction & Real Estate",
  "Consulting",
  "Education & EdTech",
  "Electronics",
  "Energy & Utilities",
  "Entertainment & Media",
  "Event Management",
  "Fashion & Apparel",
  "Fitness & Sports",
  "Food & Beverage",
  "Furniture & Home Decor",
  "Government & Public Sector",
  "Healthcare & Hospitals",
  "Hospitality & Hotels",
  "Import & Export",
  "Insurance",
  "IT & Software",
  "Jewellery",
  "Legal Services",
  "Logistics & Transport",
  "Manufacturing",
  "NGO & Non-Profit",
  "Pharmaceuticals",
  "Photography & Design",
  "Printing & Packaging",
  "Retail & E-commerce",
  "Telecom",
  "Textiles",
  "Other",
];

/**
 * The standard list merged with whatever is already on file, so an industry a
 * colleague typed once is a normal pick for everyone afterwards.
 */
export function industryOptions(existing: (string | null | undefined)[] = []) {
  const seen = new Map<string, string>();
  for (const value of [...INDUSTRIES, ...existing]) {
    const trimmed = value?.trim();
    if (!trimmed) continue;
    const key = trimmed.toLowerCase();
    if (!seen.has(key)) seen.set(key, trimmed);
  }
  // "Other" belongs at the end, next to the add-your-own option.
  const all = [...seen.values()].filter((v) => v.toLowerCase() !== "other");
  all.sort((a, b) => a.localeCompare(b));
  return [...all, "Other"];
}
