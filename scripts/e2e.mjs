/** End-to-end smoke test: sign in, create content, confirm it reaches the site. */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE ?? "http://localhost:3000";
const EMAIL = process.env.SEED_ADMIN_EMAIL;
const PASSWORD = process.env.SEED_ADMIN_PASSWORD;

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
  protocolTimeout: 120000,
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
const fails = [];
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) fails.push(label);
};

// --- sign in -------------------------------------------------------------
await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle0" });
await page.type("#email", EMAIL);
await page.type("#password", PASSWORD);
await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click('button[type="submit"]')]);
check("sign in redirects to dashboard", page.url().endsWith("/admin"), page.url());

// --- wrong password is rejected -----------------------------------------
// Needs its own context; the signed-in cookie would redirect straight to /admin.
const anon = await browser.createBrowserContext();
const page2 = await anon.newPage();
await page2.goto(`${BASE}/admin/login`, { waitUntil: "networkidle0" });
await page2.type("#email", EMAIL);
await page2.type("#password", "definitely-wrong");
await page2.click('button[type="submit"]');
await page2.waitForSelector('[role="alert"]', { timeout: 15000 }).catch(() => {});
const alertText = await page2.$eval('[role="alert"]', (e) => e.textContent).catch(() => "");
check("bad password shows an error", /do not match/i.test(alertText), alertText.slice(0, 60));
await page2.close();
await anon.close();

// --- create a testimonial through the collection manager -----------------
const marker = `E2E Reviewer ${Date.now().toString(36)}`;
await page.goto(`${BASE}/admin/testimonials`, { waitUntil: "networkidle0" });
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => /add testimonial/i.test(b.textContent ?? ""));
  btn?.click();
});
await page.waitForSelector('[role="dialog"] textarea[name="quote"]', { timeout: 15000 });
await page.type('textarea[name="quote"]', "Created by the automated end-to-end check.");
await page.type('input[name="authorName"]', marker);
await page.type('input[name="company"]', "E2E Corp");
await page.evaluate(() => {
  const cb = document.querySelector('[role="dialog"] input[name="isFeatured"]');
  if (cb && !cb.checked) cb.click();
});
await page.click('[role="dialog"] button[type="submit"]');
await page.waitForFunction((m) => document.body.innerText.includes(m), { timeout: 20000 }, marker);
check("testimonial created and listed", true);

// --- it appears on the public home page ----------------------------------
const site = await browser.newPage();
await site.goto(`${BASE}/`, { waitUntil: "networkidle0" });
const onSite = await site.evaluate((m) => document.body.innerHTML.includes(m), marker);
check("new testimonial is live on the home page", onSite);

// --- settings save round-trips -------------------------------------------
await page.goto(`${BASE}/admin/settings`, { waitUntil: "domcontentloaded" });
await page.waitForSelector("#tagline", { timeout: 30000 });
const tagline = "Web • Apps • Marketing • Growth";
// Set through the native setter so React sees the change without a real click,
// which the sticky save bar can intercept.
await page.$eval(
  "#tagline",
  (el, value) => {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
    setter.call(el, value);
    el.dispatchEvent(new Event("input", { bubbles: true }));
  },
  tagline,
);
// Scope to the settings form - the sidebar's sign-out control is also a
// submit button and appears earlier in the DOM.
await page.$eval("#tagline", (el) => {
  const form = el.closest("form");
  form.querySelector('button[type="submit"]').click();
});
await page.waitForFunction(() => /Settings saved/i.test(document.body.innerText), { timeout: 25000 }).catch(() => {});
check("settings save confirms", /Settings saved/i.test(await page.evaluate(() => document.body.innerText)));

// --- delete the test row so the database stays clean ---------------------
await page.goto(`${BASE}/admin/testimonials`, { waitUntil: "networkidle0" });
await page.evaluate((m) => {
  const row = [...document.querySelectorAll("tr")].find((r) => r.innerText.includes(m));
  row?.querySelector('button[aria-label^="Delete"]')?.click();
}, marker);
await new Promise((r) => setTimeout(r, 400));
await page.evaluate((m) => {
  const row = [...document.querySelectorAll("tr")].find((r) => r.innerText.includes(m));
  row?.querySelector('button[aria-label^="Confirm delete"]')?.click();
}, marker);
await page.waitForFunction((m) => !document.body.innerText.includes(m), { timeout: 20000 }, marker).catch(() => {});
check("testimonial deleted", !(await page.evaluate((m) => document.body.innerText.includes(m), marker)));

// --- sign out ------------------------------------------------------------
await page.goto(`${BASE}/admin`, { waitUntil: "networkidle0" });
await page.evaluate(() => {
  document.querySelector("details > summary")?.click();
});
await new Promise((r) => setTimeout(r, 300));
await Promise.all([
  page.waitForNavigation({ waitUntil: "networkidle0" }).catch(() => {}),
  page.evaluate(() => {
    const b = [...document.querySelectorAll("button")].find((x) => /sign out/i.test(x.textContent ?? ""));
    b?.click();
  }),
]);
check("sign out returns to login", page.url().includes("/admin/login"), page.url());

await browser.close();
console.log(fails.length ? `\n${fails.length} check(s) failed` : "\nAll checks passed");
process.exit(fails.length ? 1 : 0);
