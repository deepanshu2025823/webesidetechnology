/** Full-page screenshots at desktop and mobile widths, for visual review. */
import puppeteer from "puppeteer-core";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE ?? "http://localhost:3000";
const OUT = process.env.OUT ?? "screenshots";
const COOKIE = process.env.ADMIN_COOKIE;

await mkdir(OUT, { recursive: true });

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

for (const target of process.argv.slice(2)) {
  const [urlPath, viewport = "desktop"] = target.split("@");
  const [width, height] = viewport === "mobile" ? [390, 844] : [1440, 900];

  const page = await browser.newPage();
  await page.setViewport({ width, height, deviceScaleFactor: 1 });
  if (COOKIE) {
    await page.setCookie({ name: "webeside_admin", value: COOKIE, domain: "localhost", path: "/" });
  }
  await page.goto(`${BASE}${urlPath}`, { waitUntil: "networkidle0", timeout: 60000 });

  await page.evaluate(async () => {
    for (let y = 0; y < document.body.scrollHeight; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 60));
    }
    window.scrollTo(0, 0);
  });
  await new Promise((r) => setTimeout(r, 1500));

  const name = (urlPath === "/" ? "home" : urlPath.replace(/^\//, "").replace(/\//g, "-")) + `-${viewport}`;
  await page.screenshot({ path: path.join(OUT, `${name}.png`), fullPage: true });
  console.log(`${name}.png`);
  await page.close();
}

await browser.close();
