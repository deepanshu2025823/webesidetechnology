/**
 * Turns the supplied Sahab India logo (gold + navy on a solid light
 * background) into transparent PNG variants and the favicon set.
 *
 * The source is an AVIF export with a warm off-white backdrop, so the key
 * colour is sampled from the border rather than assumed to be pure white.
 *
 * Run with: node scripts/build-brand-assets.mjs <source.png>
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const SRC = process.argv[2];
const PUBLIC_DIR = path.join(process.cwd(), "public");
const BRAND_DIR = path.join(PUBLIC_DIR, "brand");
const APP_DIR = path.join(process.cwd(), "src", "app");

// Coverage at/above this counts as solid artwork and keeps its exact brand colour.
const SOLID_CUTOFF = 0.7;
// Coverage at/below this is background noise from AVIF compression.
const CLEAR_CUTOFF = 0.07;

/** Median RGB of the outer border ring - the colour we knock out. */
async function sampleBackground(input) {
  const { width, height } = await sharp(input).metadata();
  const band = Math.max(2, Math.round(Math.min(width, height) * 0.01));
  const strips = await Promise.all([
    sharp(input).extract({ left: 0, top: 0, width, height: band }).stats(),
    sharp(input).extract({ left: 0, top: height - band, width, height: band }).stats(),
    sharp(input).extract({ left: 0, top: 0, width: band, height }).stats(),
    sharp(input).extract({ left: width - band, top: 0, width: band, height }).stats(),
  ]);
  return [0, 1, 2].map((c) => strips.reduce((sum, s) => sum + s.channels[c].mean, 0) / strips.length);
}

/** Knock the background out, keeping solid artwork at its original colour. */
async function makeTransparent(input, bg) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.alloc(data.length);

  for (let i = 0; i < data.length; i += 4) {
    const px = [data[i], data[i + 1], data[i + 2]];

    // observed = ink * a + bg * (1 - a); the darkest channel ratio estimates a.
    const ratio = Math.min(px[0] / bg[0], px[1] / bg[1], px[2] / bg[2]);
    const a = Math.max(0, Math.min(1, 1 - ratio));

    if (a >= SOLID_CUTOFF) {
      // Solid gold / navy - preserve the brand colour byte for byte.
      out[i] = px[0];
      out[i + 1] = px[1];
      out[i + 2] = px[2];
      out[i + 3] = 255;
    } else if (a <= CLEAR_CUTOFF) {
      out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
    } else {
      // Anti-aliased edge - un-premultiply so it composites cleanly on any colour.
      for (let c = 0; c < 3; c++) {
        out[i + c] = Math.max(0, Math.min(255, Math.round((px[c] - bg[c] * (1 - a)) / a)));
      }
      out[i + 3] = Math.round(a * 255);
    }
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

/** Repaint the dark navy ink as warm white so the logo reads on dark surfaces. */
async function invertNavy(input) {
  const { data, info } = await sharp(input).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);

  for (let i = 0; i < out.length; i += 4) {
    if (out[i + 3] === 0) continue;
    const [r, g, b] = [out[i], out[i + 1], out[i + 2]];
    const luma = 0.299 * r + 0.587 * g + 0.114 * b;
    if (b >= r && luma < 120) {
      out[i] = 0xf8;
      out[i + 1] = 0xf5;
      out[i + 2] = 0xed;
    }
  }

  return sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } }).png().toBuffer();
}

async function main() {
  await mkdir(BRAND_DIR, { recursive: true });

  const bg = await sampleBackground(SRC);
  console.log("keyed background:", bg.map((c) => Math.round(c)).join(","));

  const transparent = await makeTransparent(SRC, bg);
  const trimmed = await sharp(transparent).trim({ threshold: 1 }).png().toBuffer();
  const m = await sharp(trimmed).metadata();
  console.log(`trimmed lockup: ${m.width}x${m.height}`);

  await sharp(trimmed).resize({ width: 1024 }).png({ compressionLevel: 9 }).toFile(path.join(BRAND_DIR, "logo.png"));
  const light = await invertNavy(trimmed);
  await sharp(light).resize({ width: 1024 }).png({ compressionLevel: 9 }).toFile(path.join(BRAND_DIR, "logo-light.png"));

  // Crown mark only - legible at favicon sizes where the full lockup is not.
  // The badge ring is inscribed in the trimmed bounds, so anything beyond 88% of
  // its radius is ring, not crown, and gets erased before cropping.
  const mark = await cropCrown(trimmed, m);
  await sharp(mark).resize({ width: 512 }).png().toFile(path.join(BRAND_DIR, "logo-mark.png"));
  const markLight = await invertNavy(mark);
  await sharp(markLight).resize({ width: 512 }).png().toFile(path.join(BRAND_DIR, "logo-mark-light.png"));

  const markMeta = await sharp(mark).metadata();
  console.log(`crown mark: ${markMeta.width}x${markMeta.height}`);

  await buildFavicons(markLight);
  await buildSocialCard(light);
}

/** Erase the badge ring, then trim down to the crown alone. */
async function cropCrown(lockup, meta) {
  const { data, info } = await sharp(lockup).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  const out = Buffer.from(data);
  const cx = info.width / 2;
  const cy = info.height / 2;
  const limit = Math.min(info.width, info.height) / 2 * 0.88;

  for (let y = 0; y < info.height; y++) {
    for (let x = 0; x < info.width; x++) {
      const i = (y * info.width + x) * 4;
      if (Math.hypot(x - cx, y - cy) > limit) {
        out[i] = out[i + 1] = out[i + 2] = out[i + 3] = 0;
      }
    }
  }

  const ringless = await sharp(out, { raw: { width: info.width, height: info.height, channels: 4 } })
    .png()
    .toBuffer();

  // Sharp runs trim before extract in one pipeline, so crop and trim separately.
  const cropped = await sharp(ringless)
    .extract({ left: 0, top: 0, width: info.width, height: Math.round(meta.height * 0.58) })
    .png()
    .toBuffer();

  return sharp(cropped).trim({ threshold: 1 }).png().toBuffer();
}

/** Navy rounded-square app icons plus a multi-size .ico. */
async function buildFavicons(markLight) {
  const NAVY = "#0e1a3f";
  const icon = async (size, radiusRatio = 0.22) => {
    const pad = Math.round(size * 0.16);
    const art = await sharp(markLight)
      .resize({ width: size - pad * 2, height: size - pad * 2, fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } })
      .toBuffer();
    const r = Math.round(size * radiusRatio);
    const rounded = Buffer.from(
      `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="${NAVY}"/></svg>`
    );
    return sharp(rounded).composite([{ input: art, gravity: "center" }]).png().toBuffer();
  };

  await sharp(await icon(512)).toFile(path.join(BRAND_DIR, "icon-512.png"));
  await sharp(await icon(192)).toFile(path.join(BRAND_DIR, "icon-192.png"));
  await sharp(await icon(180, 0.0)).toFile(path.join(APP_DIR, "apple-icon.png"));
  await sharp(await icon(64)).toFile(path.join(APP_DIR, "icon.png"));

  // .ico with 16/32/48px frames for legacy browsers and search-result chips.
  const frames = await Promise.all([16, 32, 48].map(async (s) => ({ size: s, png: await icon(s, 0.14) })));
  await writeFile(path.join(PUBLIC_DIR, "favicon.ico"), buildIco(frames));
  console.log("wrote favicon set (ico 16/32/48, icon.png, apple-icon.png, 192, 512)");
}

/** Minimal ICO container wrapping PNG frames. */
function buildIco(frames) {
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0);
  header.writeUInt16LE(1, 2); // type: icon
  header.writeUInt16LE(frames.length, 4);

  let offset = 6 + frames.length * 16;
  const dir = [];
  for (const f of frames) {
    const e = Buffer.alloc(16);
    e.writeUInt8(f.size === 256 ? 0 : f.size, 0);
    e.writeUInt8(f.size === 256 ? 0 : f.size, 1);
    e.writeUInt8(0, 2); // palette
    e.writeUInt8(0, 3); // reserved
    e.writeUInt16LE(1, 4); // colour planes
    e.writeUInt16LE(32, 6); // bits per pixel
    e.writeUInt32LE(f.png.length, 8);
    e.writeUInt32LE(offset, 12);
    offset += f.png.length;
    dir.push(e);
  }

  return Buffer.concat([header, ...dir, ...frames.map((f) => f.png)]);
}

/** Default 1200x630 Open Graph card on the brand navy. */
async function buildSocialCard(lockupLight) {
  const art = await sharp(lockupLight).resize({ height: 380 }).toBuffer();
  const bg = Buffer.from(
    `<svg width="1200" height="630">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#0b1430"/>
          <stop offset="55%" stop-color="#12224e"/>
          <stop offset="100%" stop-color="#0b1430"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#g)"/>
      <rect x="0" y="0" width="1200" height="6" fill="#c09a2e"/>
      <rect x="0" y="624" width="1200" height="6" fill="#c09a2e"/>
      <text x="600" y="560" font-family="Georgia, serif" font-size="30" letter-spacing="6"
            fill="#c9a961" text-anchor="middle">WEB • APPS • MARKETING • GROWTH</text>
    </svg>`
  );
  await sharp(bg)
    .composite([{ input: art, top: 90, left: Math.round((1200 - (await sharp(art).metadata()).width) / 2) }])
    .png()
    .toFile(path.join(BRAND_DIR, "og-default.png"));
  console.log("wrote og-default.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
