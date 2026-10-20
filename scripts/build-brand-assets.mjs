/**
 * Builds the static brand set from the Sahab India Brand artwork - the lockup
 * with the lamp lighting a gold chess king.
 *
 * The client supplies three transparent exports, the same ones uploaded under
 * Admin → Settings → Logos:
 *
 *   light  navy + gold lockup, for light backgrounds
 *   dark   white + gold lockup, for the navy header, footer and login panels
 *   mark   the lamp and king on their own
 *
 * The admin settings only reach pages that read them. The favicon, app icons,
 * social card and the `/brand/*` files that DEFAULT_SETTINGS and a few fixed
 * placements point at are static, so they have to be rebuilt from the same
 * artwork or the old logo keeps showing there.
 *
 * Run with: node scripts/build-brand-assets.mjs <light> <dark> <mark>
 */
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const [LIGHT, DARK, MARK] = process.argv.slice(2);
if (!LIGHT || !DARK || !MARK) {
  console.error("usage: node scripts/build-brand-assets.mjs <light> <dark> <mark>");
  process.exit(1);
}

// Kept in step with the tokens in globals.css.
const GOLD_DEEP = "#b58726";
const PUBLIC_DIR = path.join(process.cwd(), "public");
const BRAND_DIR = path.join(PUBLIC_DIR, "brand");
const APP_DIR = path.join(process.cwd(), "src", "app");

const CLEAR = { r: 0, g: 0, b: 0, alpha: 0 };

async function main() {
  await mkdir(BRAND_DIR, { recursive: true });

  // The lockups keep the client's own framing so they sit exactly like the
  // uploaded copies the header and footer use (2:1).
  await sharp(LIGHT).resize({ width: 1024 }).png({ compressionLevel: 9 }).toFile(path.join(BRAND_DIR, "logo.png"));
  await sharp(DARK).resize({ width: 1024 }).png({ compressionLevel: 9 }).toFile(path.join(BRAND_DIR, "logo-light.png"));

  // The mark's lamp is white and its cone navy, so one file reads on both the
  // navy chrome and white cards; both names are kept for the existing callers.
  const mark = await sharp(MARK).trim({ threshold: 10 }).png().toBuffer();
  await sharp(mark).resize({ width: 512 }).png().toFile(path.join(BRAND_DIR, "logo-mark.png"));
  await sharp(mark).resize({ width: 512 }).png().toFile(path.join(BRAND_DIR, "logo-mark-light.png"));
  const markMeta = await sharp(BRAND_DIR + "/logo-mark.png").metadata();
  console.log(`mark: ${markMeta.width}x${markMeta.height}`);

  await buildFavicons(await cropForIcon(MARK));
  await buildSocialCard(DARK);
}

/**
 * The mark without its hanging rod.
 *
 * The rod is a hairline that vanishes below 64px and only shrinks everything
 * else, so the icons start at the shade: the navy cone and the gold king are
 * what still read in a browser tab.
 */
async function cropForIcon(input) {
  const trimmed = await sharp(input).trim({ threshold: 10 }).png().toBuffer();
  const { width, height } = await sharp(trimmed).metadata();
  const { data, info } = await sharp(trimmed).ensureAlpha().raw().toBuffer({ resolveWithObject: true });

  // The rod is a few pixels wide; the first row much wider than that is the shade.
  let top = 0;
  for (let y = 0; y < info.height; y++) {
    let inked = 0;
    for (let x = 0; x < info.width; x++) if (data[(y * info.width + x) * 4 + 3] > 24) inked++;
    if (inked > info.width * 0.08) {
      top = y;
      break;
    }
  }

  const cut = await sharp(trimmed).extract({ left: 0, top, width, height: height - top }).png().toBuffer();
  return sharp(cut).trim({ threshold: 10 }).png().toBuffer();
}

/**
 * White rounded-square app icons plus a multi-size .ico.
 *
 * White rather than the brand navy: the mark's cone is navy itself, and on a
 * navy plate it disappears and leaves a floating king.
 */
async function buildFavicons(art) {
  const icon = async (size, radiusRatio = 0.22, padRatio = 0.12) => {
    const pad = Math.round(size * padRatio);
    const fitted = await sharp(art)
      .resize({ width: size - pad * 2, height: size - pad * 2, fit: "contain", background: CLEAR })
      .toBuffer();
    const r = Math.round(size * radiusRatio);
    const plate = Buffer.from(
      `<svg width="${size}" height="${size}"><rect width="${size}" height="${size}" rx="${r}" ry="${r}" fill="#ffffff"/></svg>`
    );
    return sharp(plate).composite([{ input: fitted, gravity: "center" }]).png().toBuffer();
  };

  await sharp(await icon(512)).toFile(path.join(BRAND_DIR, "icon-512.png"));
  await sharp(await icon(192)).toFile(path.join(BRAND_DIR, "icon-192.png"));
  // iOS rounds the corners itself.
  await sharp(await icon(180, 0)).toFile(path.join(APP_DIR, "apple-icon.png"));
  await sharp(await icon(64)).toFile(path.join(APP_DIR, "icon.png"));

  // .ico with 16/32/48px frames for legacy browsers and search-result chips.
  // Tighter padding at these sizes: every pixel of artwork counts.
  const frames = await Promise.all([16, 32, 48].map(async (s) => ({ size: s, png: await icon(s, 0.14, 0.06) })));
  await writeFile(path.join(PUBLIC_DIR, "favicon.ico"), buildIco(frames));
  console.log("wrote icon set (ico 16/32/48, icon.png, apple-icon.png, 192, 512)");
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

/**
 * Default 1200x630 Open Graph card on the brand navy.
 *
 * Social platforms flatten transparency onto white or black, so a bare
 * transparent lockup is not usable as a share image; it goes on a solid card.
 */
async function buildSocialCard(lockupDark) {
  const art = await sharp(lockupDark).resize({ width: 1000 }).toBuffer();
  const { width, height } = await sharp(art).metadata();

  const bg = Buffer.from(
    `<svg width="1200" height="630">
      <defs>
        <linearGradient id="g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#010c37"/>
          <stop offset="55%" stop-color="#03186d"/>
          <stop offset="100%" stop-color="#010c37"/>
        </linearGradient>
      </defs>
      <rect width="1200" height="630" fill="url(#g)"/>
      <rect x="0" y="0" width="1200" height="6" fill="${GOLD_DEEP}"/>
      <rect x="0" y="624" width="1200" height="6" fill="${GOLD_DEEP}"/>
    </svg>`
  );

  await sharp(bg)
    .composite([{ input: art, top: Math.round((630 - height) / 2), left: Math.round((1200 - width) / 2) }])
    .png()
    .toFile(path.join(BRAND_DIR, "og-default.png"));
  console.log("wrote og-default.png");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
