/** Tiny class-name joiner - avoids pulling in clsx for a handful of call sites. */
export function cn(...parts: Array<string | false | null | undefined>) {
  return parts.filter(Boolean).join(" ");
}

export function formatDate(value: Date | string | null | undefined, opts?: Intl.DateTimeFormatOptions) {
  if (!value) return "";
  return new Intl.DateTimeFormat("en-IN", opts ?? { day: "numeric", month: "short", year: "numeric" }).format(
    new Date(value),
  );
}

/**
 * The site's own origin, as an absolute URL.
 *
 * `NEXT_PUBLIC_SITE_URL` is typed by hand into an env file or a CI variable,
 * and it arrives without a scheme often enough to be worth handling: a bare
 * "www.example.com" throws in `new URL()` and fails the whole build, and
 * anywhere it does not throw it silently produces schemeless canonicals and
 * Open Graph tags that crawlers reject. A missing scheme is assumed to be
 * https, which is the only thing it can sensibly mean in production.
 */
export function siteUrl() {
  const raw = (process.env.NEXT_PUBLIC_SITE_URL ?? "").trim().replace(/\/+$/, "");
  if (!raw) return "http://localhost:3000";
  return /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
}

export function absoluteUrl(path = "") {
  return `${siteUrl()}${path.startsWith("/") ? path : `/${path}`}`;
}

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/['"]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

export function excerptFrom(html: string, length = 160) {
  const text = html.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim();
  return text.length > length ? `${text.slice(0, length).trimEnd()}…` : text;
}

export function readingMinutes(html: string) {
  const words = html.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 220));
}

/** Narrow a Prisma Json column to an array of a known shape. */
export function asArray<T>(value: unknown): T[] {
  return Array.isArray(value) ? (value as T[]) : [];
}

/** Whole-rupee formatting. Money is stored as integers to avoid float drift. */
export function formatMoney(amount: number, currency = "INR") {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}
