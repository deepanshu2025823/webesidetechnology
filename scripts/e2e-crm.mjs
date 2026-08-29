/**
 * End-to-end test of the Phase 1 platform:
 * lead → client → quotation → project → milestone → task, plus role gating.
 */
import puppeteer from "puppeteer-core";

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const BASE = process.env.BASE ?? "http://localhost:3010";
const EMAIL = process.env.SEED_ADMIN_EMAIL;
const PASSWORD = process.env.SEED_ADMIN_PASSWORD;
const STAMP = Date.now().toString(36);

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox"],
  protocolTimeout: 120000,
});

const fails = [];

/** Retries a page-side predicate; TiDB round-trips make single-shot checks flaky. */
async function eventually(page, predicate, { tries = 8, gap = 1500 } = {}) {
  for (let i = 0; i < tries; i++) {
    // Evaluating mid-navigation destroys the execution context; just retry.
    const hit = await page.evaluate(predicate).catch(() => false);
    if (hit) return true;
    await new Promise((r) => setTimeout(r, gap));
    await page.reload({ waitUntil: "domcontentloaded", timeout: 60000 }).catch(() => {});
  }
  return false;
}
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) fails.push(label);
};

async function signIn(page, email, password) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle0" });
  await page.type("#email", email);
  await page.type("#password", password);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click('button[type="submit"]')]);
}

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
await signIn(page, EMAIL, PASSWORD);
check("super admin signs in", page.url().endsWith("/admin"));

// ---- client -------------------------------------------------------------
const clientName = `Acme Retail ${STAMP}`;
await page.goto(`${BASE}/admin/clients/new`, { waitUntil: "networkidle0" });
await page.type("#name", clientName);
await page.type("#industry", "Retail");
await page.select("#status", "ACTIVE");
await page.$eval("#name", (el) => el.closest("form").querySelector('button[type="submit"]').click());
await page.waitForFunction((n) => document.body.innerText.includes(n), { timeout: 30000 }, clientName);
const clientUrl = page.url();
check("client created", /\/admin\/clients\/[a-z0-9]+$/.test(clientUrl), clientUrl.split("/").pop());

// ---- contact ------------------------------------------------------------
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => /add contact/i.test(b.textContent ?? ""));
  btn?.click();
});
await page.waitForSelector("#contact-name", { timeout: 15000 });
await page.type("#contact-name", "Priya Sharma");
await page.type("#contact-designation", "Marketing Head");
await page.type("#contact-email", `priya.${STAMP}@example.com`);
await page.$eval("#contact-name", (el) => el.closest("form").querySelector('button[type="submit"]').click());
await page.waitForFunction(() => document.body.innerText.includes("Priya Sharma"), { timeout: 20000 });
check("contact added to client", true);

// ---- activity timeline --------------------------------------------------
await page.$eval('textarea[name="body"]', (el) => {
  const set = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  set.call(el, "Kick-off call booked for next week.");
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.closest("form").querySelector('button[type="submit"]').click();
});
await page.waitForFunction(() => document.body.innerText.includes("Kick-off call booked"), { timeout: 20000 });
check("client activity logged", true);

// ---- quotation ----------------------------------------------------------
const quoteTitle = `Website + SEO ${STAMP}`;
await page.goto(`${BASE}/admin/quotations/new`, { waitUntil: "networkidle0" });
await page.type("#title", quoteTitle);
const clientId = clientUrl.split("/").pop();
await page.select("#clientId", clientId);
await page.$$eval("input", (inputs) => {
  const title = inputs.find((i) => i.placeholder === "What this covers");
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(title, "Corporate website build");
  title.dispatchEvent(new Event("input", { bubbles: true }));
  const price = inputs.find((i) => i.type === "number" && i.value === "0");
  setter.call(price, "250000");
  price.dispatchEvent(new Event("input", { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 400));
const shownTotal = await page.evaluate(() => document.body.innerText.match(/₹[\d,]+/g)?.pop() ?? "");
await page.$eval("#title", (el) => el.closest("form").querySelector('button[type="submit"]').click());
await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 30000 }, quoteTitle);
const quoteUrl = page.url();
check("quotation created with priced line item", /\/admin\/quotations\/[a-z0-9]+$/.test(quoteUrl), shownTotal);

const quoteTotal = await page.evaluate(() => {
  const row = [...document.querySelectorAll("dt")].find((d) => d.textContent.trim() === "Total");
  return row?.nextElementSibling?.textContent?.trim() ?? "";
});
check("tax applied server-side", quoteTotal.includes("2,95,000") || quoteTotal.includes("295,000"), quoteTotal);

// ---- convert to project -------------------------------------------------
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => /convert to project/i.test(b.textContent ?? ""));
  btn?.click();
});
await page.waitForFunction(() => location.pathname.startsWith("/admin/client-projects/"), { timeout: 30000 });
const projectUrl = page.url();
check("quotation converted to project", /\/admin\/client-projects\/[a-z0-9]+$/.test(projectUrl));

// ---- milestone ----------------------------------------------------------
await page.$eval('input[placeholder="Milestone title"]', (el) => {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  set.call(el, "Design sign-off");
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.closest("form").querySelector('button[type="submit"]').click();
});
await page.waitForFunction(() => document.body.innerText.includes("Design sign-off"), { timeout: 20000 });
check("milestone added", true);

// ---- task ---------------------------------------------------------------
await page.$eval('input[placeholder="What needs doing?"]', (el) => {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  set.call(el, "Wireframe the home page");
  el.dispatchEvent(new Event("input", { bubbles: true }));
  el.closest("form").querySelector('button[type="submit"]').click();
});
await page.waitForFunction(() => document.body.innerText.includes("Wireframe the home page"), { timeout: 20000 });
check("task added to project", true);

// ---- move the task ------------------------------------------------------
await page.evaluate(() => {
  const card = [...document.querySelectorAll("li")].find((li) => li.innerText.includes("Wireframe the home page"));
  const select = card?.querySelector("select");
  if (select) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
    setter.call(select, "IN_PROGRESS");
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
});
await new Promise((r) => setTimeout(r, 2500));
await page.goto(projectUrl, { waitUntil: "networkidle0", timeout: 60000 });
const column = await page.evaluate(() => {
  const card = [...document.querySelectorAll("li")].find((li) => li.innerText.includes("Wireframe the home page"));
  return card?.closest("section")?.querySelector("h3")?.textContent?.trim() ?? "not found";
});
check("task moved to In progress", column === "In progress", column);

// ---- change request -----------------------------------------------------
await page.$eval('input[placeholder="What is changing?"]', (el) => {
  const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  set.call(el, "Add a blog module");
  el.dispatchEvent(new Event("input", { bubbles: true }));
  const form = el.closest("form");
  const desc = form.querySelector("textarea");
  const tset = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
  tset.call(desc, "Client wants a blog with categories.");
  desc.dispatchEvent(new Event("input", { bubbles: true }));
  const cost = form.querySelector('input[name="costImpact"]');
  set.call(cost, "40000");
  cost.dispatchEvent(new Event("input", { bubbles: true }));
  form.querySelector('button[type="submit"]').click();
});
await page.waitForFunction(() => document.body.innerText.includes("Add a blog module"), { timeout: 20000 });
check("change request raised", true);

// ---- approve it, budget should grow -------------------------------------
const budgetBefore = await page.evaluate(() => {
  const tile = [...document.querySelectorAll("p")].find((el) => el.textContent.trim() === "Budget");
  return tile?.nextElementSibling?.textContent?.trim() ?? "";
});
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => b.textContent.trim() === "Approve");
  btn?.click();
});
await new Promise((r) => setTimeout(r, 2500));
await page.goto(projectUrl, { waitUntil: "networkidle0", timeout: 60000 });
const approved = await page.evaluate(() => document.body.innerText.includes("Approved"));
// Read the Budget tile specifically rather than the first rupee value on the page.
const budgetAfter = await page.evaluate(() => {
  const tile = [...document.querySelectorAll("p")].find((el) => el.textContent.trim() === "Budget");
  return tile?.nextElementSibling?.textContent?.trim() ?? "";
});
check("change request approved", approved);
check("approved change grew the budget", Boolean(budgetAfter) && budgetAfter !== budgetBefore, `${budgetBefore} → ${budgetAfter}`);

// ---- create a restricted teammate ---------------------------------------
const memberEmail = `member.${STAMP}@example.com`;
await page.goto(`${BASE}/admin/users`, { waitUntil: "networkidle0" });
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => /add team member/i.test(b.textContent ?? ""));
  btn?.click();
});
await page.waitForSelector("#name", { timeout: 15000 });
await page.type("#name", "Test Team Member");
await page.type("#email", memberEmail);
await page.type("#password", "member-pass-1234");
await page.select("#role", "TEAM_MEMBER");
await page.$eval("#name", (el) => el.closest("form").querySelector('button[type="submit"]').click());
const memberCreated = await eventually(
  page,
  `document.body.innerText.includes(${JSON.stringify(memberEmail)})`,
  { tries: 6 },
);
check("team member account created", memberCreated, memberEmail);

// ---- that teammate must not reach clients -------------------------------
const restricted = await browser.createBrowserContext();
const memberPage = await restricted.newPage();
await memberPage.setViewport({ width: 1440, height: 1000 });
await signIn(memberPage, memberEmail, "member-pass-1234");
check("team member signs in", memberPage.url().endsWith("/admin"), memberPage.url());

const sidebarItems = await memberPage.evaluate(() =>
  [...document.querySelectorAll("aside a")].map((a) => a.getAttribute("href")),
);
check("clients hidden from sidebar", !sidebarItems.includes("/admin/clients"), sidebarItems.filter(Boolean).join(" "));
check("settings hidden from sidebar", !sidebarItems.includes("/admin/settings"));
check("tasks visible to team member", sidebarItems.includes("/admin/tasks"));

await memberPage.goto(`${BASE}/admin/clients`, { waitUntil: "domcontentloaded", timeout: 60000 });
check("direct URL to clients is blocked", memberPage.url().includes("/admin?denied="), memberPage.url());

await memberPage.goto(`${BASE}/admin/settings`, { waitUntil: "domcontentloaded", timeout: 60000 });
check("direct URL to settings is blocked", memberPage.url().includes("/admin?denied="), memberPage.url());

await restricted.close();
await browser.close();

console.log(fails.length ? `\n${fails.length} check(s) failed` : "\nAll checks passed");
console.log("Run `npx tsx scripts/e2e-cleanup.mjs` to remove the records this test created.");
process.exit(fails.length ? 1 : 0);
