/**
 * Downloads the curated stock photography used by the seed content.
 *
 * Source: Unsplash. The Unsplash License permits commercial use without
 * permission or attribution. Every image below was reviewed by eye before
 * being added; ids are kept so the client can trace or replace any of them.
 *
 * Run: node scripts/fetch-stock-images.mjs
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "uploads", "stock");

/** [unsplash id, output name, crop] — "wide" 16:9, "card" 16:10, "square" 1:1 */
const IMAGES = [
  // Hero — cropped to the hero card's own ratio so nothing important is lost.
  ["photo-1531482615713-2afd69097998", "hero-build", "hero"],
  ["photo-1542744094-24638eff58bb", "hero-strategy", "hero"],
  ["photo-1522202176988-66273c2fd55f", "hero-collaborate", "hero"],

  // Services
  ["photo-1551434678-e076c223a692", "service-web-development", "card"],
  ["photo-1512486130939-2c4f79935e4f", "service-app-development", "card"],
  ["photo-1556155092-490a1ba16284", "service-web-portals", "card"],
  ["photo-1460925895917-afdab827c52f", "service-seo", "card"],
  ["photo-1554177255-61502b352de3", "service-social-media", "card"],
  ["photo-1607703703520-bb638e84caf2", "service-meta-ads", "card"],
  ["photo-1526628953301-3e589a6a8b74", "service-google-ads", "card"],
  ["photo-1504711434969-e33886168f5c", "service-pr", "card"],
  ["photo-1505373877841-8d25f7d46678", "service-events", "card"],
  ["photo-1455390582262-044cdead277a", "service-content", "card"],
  ["photo-1555949963-ff9fe0c870eb", "service-api", "card"],
  ["photo-1611746872915-64382b5c76da", "service-whatsapp", "card"],
  ["photo-1512428559087-560fa5ceab42", "service-sms", "card"],
  ["photo-1534536281715-e28d76689b4d", "service-ivr", "card"],

  // Portfolio
  ["photo-1519337265831-281ec6cc8514", "case-logistics-portal", "card"],
  ["photo-1497366754035-f200968a6e72", "case-interiors", "card"],
  ["photo-1516321318423-f06f85e504b3", "case-paid-media", "card"],
  ["photo-1499951360447-b19be8fe80f5", "case-interiors-2", "card"],
  ["photo-1591696205602-2f950c417cb9", "case-paid-media-2", "card"],
  ["photo-1553877522-43269d4ea984", "case-logistics-portal-2", "card"],

  // Blog
  ["photo-1486406146926-c627a92ad1ab", "post-website-cost", "wide"],
  ["photo-1461749280684-dccba630e2f6", "post-technical-seo", "wide"],
  ["photo-1533750349088-cd871a92f312", "post-meta-vs-google", "wide"],

  // People
  ["photo-1560250097-0b93528c311a", "team-1", "square"],
  ["photo-1573497019940-1c28c88b4f3e", "team-2", "square"],
  ["photo-1519085360753-af0119f7cbe7", "team-3", "square"],
  ["photo-1580489944761-15a19d654956", "team-4", "square"],

  // Page headers
  ["photo-1522071820081-009f0129c71c", "page-about", "wide"],
  ["photo-1524758631624-e2822e304c36", "page-contact", "wide"],
];

const SIZES = {
  /** Matches the hero card's 4 / 3.2 box. */
  hero: { width: 1200, height: 960 },
  wide: { width: 1600, height: 900 },
  card: { width: 1200, height: 750 },
  square: { width: 700, height: 700 },
};

async function main() {
  await mkdir(OUT, { recursive: true });
  const manifest = [];

  for (const [id, name, crop] of IMAGES) {
    const url = `https://images.unsplash.com/${id}?w=2000&q=85&fm=jpg&fit=crop`;
    const res = await fetch(url);
    if (!res.ok) {
      console.error(`✗ ${name} (${res.status})`);
      continue;
    }

    const input = Buffer.from(await res.arrayBuffer());
    const { width, height } = SIZES[crop];
    const output = await sharp(input)
      .resize({ width, height, fit: "cover", position: crop === "square" ? "top" : "centre" })
      .webp({ quality: 80 })
      .toBuffer();

    await writeFile(path.join(OUT, `${name}.webp`), output);
    manifest.push({ name, file: `/uploads/stock/${name}.webp`, source: `https://unsplash.com/photos/${id}`, bytes: output.length });
    console.log(`✓ ${name}.webp  ${width}×${height}  ${Math.round(output.length / 1024)} KB`);
  }

  await writeFile(
    path.join(OUT, "CREDITS.json"),
    JSON.stringify({ license: "Unsplash License — free for commercial use, no attribution required", images: manifest }, null, 2),
  );
  console.log(`\n${manifest.length} images written to public/uploads/stock`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
