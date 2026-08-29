/**
 * Renders pages in a real Chrome and reports layout and console problems:
 * horizontal overflow, images that failed to decode, images distorted by a
 * stretching parent, and console errors.
 *
 *   node scripts/audit.mjs / /services /contact
 *   WIDTHS=360,768,1024,1440 BASE=http://localhost:3000 node scripts/audit.mjs /
 *   ADMIN_COOKIE=<jwt> node scripts/audit.mjs /admin /admin/settings
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE ?? "http://localhost:3000";
const PATHS = process.argv.slice(2);
const VIEWPORTS = process.env.WIDTHS
  ? process.env.WIDTHS.split(",").map((w) => [`${w}px`, Number(w), 900])
  : [["mobile", 390, 844], ["desktop", 1440, 900]];

// A wide breakpoint sweep only needs layout, so it skips the lazy-load pass
// that makes the default two-viewport run slow.
const LAYOUT_ONLY = Boolean(process.env.WIDTHS);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

for (const path of PATHS) {
  for (const [label, width, height] of VIEWPORTS) {
    const page = await browser.newPage();
    if (process.env.ADMIN_COOKIE) {
      await page.setCookie({ name: "sahab_admin", value: process.env.ADMIN_COOKIE, domain: "localhost", path: "/" });
    }
    const errors = [];
    page.on("console", (m) => m.type() === "error" && errors.push(m.text().slice(0, 160)));
    page.on("pageerror", (e) => errors.push(`pageerror: ${e.message.slice(0, 160)}`));

    await page.setViewport({ width, height, deviceScaleFactor: 1, isMobile: label === "mobile" });
    await page.goto(`${BASE}${path}`, {
      waitUntil: LAYOUT_ONLY ? "domcontentloaded" : "networkidle0",
      timeout: 45000,
    });

    if (LAYOUT_ONLY) {
      await new Promise((r) => setTimeout(r, 400));
    } else {
      // Lazy images only fetch once they approach the viewport.
      await page.evaluate(async () => {
        await new Promise((resolve) => {
          let y = 0;
          const timer = setInterval(() => {
            window.scrollTo(0, (y += window.innerHeight));
            if (y >= document.body.scrollHeight) {
              clearInterval(timer);
              window.scrollTo(0, 0);
              resolve(undefined);
            }
          }, 90);
        });
      });
      await new Promise((r) => setTimeout(r, 1200));
    }

    const report = await page.evaluate(() => {
      const docWidth = document.documentElement.scrollWidth;
      const viewport = document.documentElement.clientWidth;
      const offenders = [];
      if (docWidth > viewport + 1) {
        for (const el of document.querySelectorAll("body *")) {
          const r = el.getBoundingClientRect();
          if (r.width === 0) continue;
          if (r.right > viewport + 1 || r.left < -1) {
            offenders.push({
              tag: el.tagName.toLowerCase(),
              cls: (el.className?.baseVal ?? el.className ?? "").toString().slice(0, 110),
              left: Math.round(r.left),
              right: Math.round(r.right),
              width: Math.round(r.width),
            });
          }
        }
      }
      // `src` is only the srcset fallback and often never fetched, so judge
      // by what the browser actually decoded.
      const imgs = [...document.images]
        .filter((i) => i.complete && i.naturalWidth === 0)
        .map((i) => i.currentSrc || i.src);

      // Images squashed or stretched away from their real proportions — usually
      // a flex/grid parent stretching one axis. object-fit: cover/contain crop
      // or letterbox instead of distorting, so only the default "fill" counts.
      const distorted = [...document.images]
        .filter((i) => i.complete && i.naturalWidth > 0 && getComputedStyle(i).objectFit === "fill")
        .map((i) => {
          const r = i.getBoundingClientRect();
          if (r.width < 8 || r.height < 8) return null;
          const natural = i.naturalWidth / i.naturalHeight;
          const shown = r.width / r.height;
          const skew = Math.max(natural / shown, shown / natural);
          return skew > 1.15
            ? `${(i.currentSrc || i.src).split("/").pop().slice(0, 42)} natural=${natural.toFixed(2)} shown=${shown.toFixed(2)}`
            : null;
        })
        .filter(Boolean);
      return { docWidth, viewport, offenders: offenders.slice(0, 8), brokenImages: imgs.slice(0, 5), distorted: distorted.slice(0, 5) };
    });

    const overflow = report.docWidth > report.viewport + 1;
    console.log(
      `${path} [${label}] doc=${report.docWidth} vp=${report.viewport}${overflow ? "  ⚠ OVERFLOW" : "  ok"}` +
        (errors.length ? `  errors=${errors.length}` : "") +
        (report.brokenImages.length ? `  brokenImages=${report.brokenImages.length}` : "") +
        (report.distorted.length ? `  ⚠ DISTORTED=${report.distorted.length}` : ""),
    );
    for (const o of report.offenders) console.log(`    ${o.tag} l=${o.left} r=${o.right} w=${o.width} .${o.cls}`);
    for (const e of errors.slice(0, 4)) console.log(`    ! ${e}`);
    for (const i of report.brokenImages) console.log(`    broken img: ${i}`);
    for (const d of report.distorted) console.log(`    distorted: ${d}`);

    await page.close();
  }
}

await browser.close();
