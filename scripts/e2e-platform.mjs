/**
 * End-to-end test of phases 2–7: finance, renewals, campaigns, HR, partners
 * and the client portal. Assumes the CRM test has left a client behind.
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
const check = (label, ok, extra = "") => {
  console.log(`${ok ? "PASS" : "FAIL"}  ${label}${extra ? ` — ${extra}` : ""}`);
  if (!ok) fails.push(label);
};

/** Fills a field by name inside the form that owns `anchor`, then submits it. */
async function fillAndSubmit(page, anchorSelector, values) {
  await page.$eval(
    anchorSelector,
    (el, vals) => {
      const form = el.closest("form");
      const setInput = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
      const setArea = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, "value").set;
      const setSelect = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;

      for (const [name, value] of Object.entries(vals)) {
        const field = form.querySelector(`[name="${name}"]`);
        if (!field) continue;
        const setter =
          field.tagName === "TEXTAREA" ? setArea : field.tagName === "SELECT" ? setSelect : setInput;
        setter.call(field, value);
        field.dispatchEvent(new Event(field.tagName === "SELECT" ? "change" : "input", { bubbles: true }));
      }
      form.querySelector('button[type="submit"]').click();
    },
    values,
  );
}

/** Navigate, then let React hydrate before interacting with buttons. */
async function go(page, path) {
  await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 60000 });
  await new Promise((r) => setTimeout(r, 1400));
}

async function signIn(page, email, password) {
  await page.goto(`${BASE}/admin/login`, { waitUntil: "networkidle0", timeout: 60000 });
  await page.type("#email", email);
  await page.type("#password", password);
  await Promise.all([page.waitForNavigation({ waitUntil: "networkidle0" }), page.click('button[type="submit"]')]);
}

const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 1000 });
await signIn(page, EMAIL, PASSWORD);
check("admin signs in", page.url().endsWith("/admin"));

// ---- find a client to work against --------------------------------------
await go(page, "/admin/clients");
const clientHref = await page.evaluate(() => {
  // "/admin/clients/new" is the create button, not a client.
  const link = [...document.querySelectorAll('a[href^="/admin/clients/"]')].find((a) => {
    const href = a.getAttribute("href") ?? "";
    return /\/admin\/clients\/[a-z0-9]{10,}$/.test(href);
  });
  return link?.getAttribute("href") ?? null;
});
check("a client exists to test against", Boolean(clientHref), clientHref ?? "none");
const clientId = clientHref?.split("/").pop();

// ---- FINANCE: invoice, payment ------------------------------------------
await go(page, "/admin/finance/invoices/new");
const invoiceTitle = `Retainer ${STAMP}`;
await page.type("#title", invoiceTitle);
await page.select("#clientId", clientId);
await page.$$eval("input", (inputs) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  const desc = inputs.find((i) => i.placeholder === "What this covers");
  setter.call(desc, "Monthly SEO retainer");
  desc.dispatchEvent(new Event("input", { bubbles: true }));
  const price = inputs.find((i) => i.type === "number" && i.value === "0");
  setter.call(price, "50000");
  price.dispatchEvent(new Event("input", { bubbles: true }));
});
await new Promise((r) => setTimeout(r, 400));
await page.$eval("#title", (el) => el.closest("form").querySelector('button[type="submit"]').click());
await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 30000 }, invoiceTitle);
const invoiceUrl = page.url();
check("invoice created", /\/admin\/finance\/invoices\/[a-z0-9]+$/.test(invoiceUrl));

const invoiceTotal = await page.evaluate(() => {
  const dt = [...document.querySelectorAll("dt")].find((d) => d.textContent.trim() === "Invoice total");
  return dt?.nextElementSibling?.textContent?.trim() ?? "";
});
check("GST applied to invoice", invoiceTotal.includes("59,000"), invoiceTotal);

// Send it, then record a part payment.
await fillAndSubmit(page, 'select[name="status"]', { status: "SENT" });
await new Promise((r) => setTimeout(r, 2000));
await page.goto(invoiceUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise((r) => setTimeout(r, 1200));

await fillAndSubmit(page, 'input[name="amount"]', { amount: "20000", mode: "UPI", reference: `UPI-${STAMP}` });
await new Promise((r) => setTimeout(r, 2500));
await page.goto(invoiceUrl, { waitUntil: "domcontentloaded", timeout: 60000 });
await new Promise((r) => setTimeout(r, 1200));

const partial = await page.evaluate(() => document.body.innerText.includes("Partially paid"));
const balance = await page.evaluate(() => {
  const dt = [...document.querySelectorAll("dt")].find((d) => d.textContent.trim() === "Balance due");
  return dt?.nextElementSibling?.textContent?.trim() ?? "";
});
check("payment recorded and status follows the money", partial, balance);
check("balance recalculated", balance.includes("39,000"), balance);

// ---- RENEWALS: create, then run the reminder engine ---------------------
await go(page, "/admin/renewals");
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => /add renewal/i.test(b.textContent ?? ""));
  btn?.click();
});
await page.waitForSelector('input[name="name"]', { timeout: 15000 });

// Expiry exactly 30 days out so a reminder threshold fires today.
const expiry = new Date();
expiry.setDate(expiry.getDate() + 30);
await fillAndSubmit(page, 'input[name="name"]', {
  name: `domain-${STAMP}.com`,
  clientId,
  type: "DOMAIN",
  provider: "GoDaddy",
  expiryDate: expiry.toISOString().slice(0, 10),
  amount: "1200",
  reminderDays: "90,60,30,15,7,1",
});
await page.waitForFunction((n) => document.body.innerText.includes(n), { timeout: 25000 }, `domain-${STAMP}.com`);
check("renewal tracked", true);

await go(page, "/admin/integrations");
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => /run automation now/i.test(b.textContent ?? ""));
  btn?.click();
});
await new Promise((r) => setTimeout(r, 6000));
await go(page, "/admin");
const notified = await page.evaluate(() => {
  const bell = document.querySelector('button[aria-label*="notification" i]');
  return bell?.textContent?.trim() ?? "";
});
check("reminder engine raised notifications", /\d/.test(notified), `bell: ${notified || "empty"}`);

// ---- CAMPAIGNS: monthly content plan ------------------------------------
await go(page, "/admin/campaigns/social");
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => /new monthly plan/i.test(b.textContent ?? ""));
  btn?.click();
});
await page.waitForSelector('input[name="month"]', { timeout: 15000 });
const month = new Date();
await fillAndSubmit(page, 'input[name="month"]', {
  clientId,
  month: `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`,
  contractedCount: "12",
});
await page.waitForFunction(() => location.pathname.startsWith("/admin/campaigns/social/"), { timeout: 25000 }).catch(() => {});

// A client can only have one plan per month, so a re-run lands on the existing one.
if (!page.url().includes("/admin/campaigns/social/")) {
  await go(page, "/admin/campaigns/social");
  const existing = await page.evaluate(() => {
    const link = [...document.querySelectorAll('a[href^="/admin/campaigns/social/"]')][0];
    return link?.getAttribute("href") ?? null;
  });
  if (existing) await go(page, existing);
}

const planUrl = page.url();
check("content plan available", planUrl.includes("/admin/campaigns/social/"), planUrl);

if (planUrl.includes("/admin/campaigns/social/")) {
  await fillAndSubmit(page, 'input[name="title"]', { title: `Launch reel ${STAMP}`, type: "REEL", platform: "INSTAGRAM" });
  await page.waitForFunction((t) => document.body.innerText.includes(t), { timeout: 25000 }, `Launch reel ${STAMP}`);
  check("content item added to the calendar", true);
}

// ---- HR: employee, attendance, payslip ----------------------------------
await go(page, "/admin/hr/employees");
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => /add employee/i.test(b.textContent ?? ""));
  btn?.click();
});
await page.waitForSelector('[role="dialog"] input[name="name"]', { timeout: 15000 });
const empName = `Test Employee ${STAMP}`;
await page.type('[role="dialog"] input[name="name"]', empName);
await page.type('[role="dialog"] input[name="code"]', `EMP-${STAMP.slice(-4)}`);
await page.type('[role="dialog"] input[name="email"]', `emp.${STAMP}@example.com`);
await page.type('[role="dialog"] input[name="department"]', "Delivery");
await page.click('[role="dialog"] button[type="submit"]');
await page.waitForFunction((n) => document.body.innerText.includes(n), { timeout: 25000 }, empName);
check("employee record created", true);

await go(page, "/admin/hr/attendance");
const marked = await page.evaluate((name) => {
  const row = [...document.querySelectorAll("tr")].find((r) => r.innerText.includes(name));
  const form = row?.querySelector("form");
  if (!form) return false;
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  const checkIn = form.querySelector('input[name="checkIn"]');
  setter.call(checkIn, "10:00");
  checkIn.dispatchEvent(new Event("input", { bubbles: true }));
  const checkOut = form.querySelector('input[name="checkOut"]');
  setter.call(checkOut, "19:00");
  checkOut.dispatchEvent(new Event("input", { bubbles: true }));
  form.querySelector('button[type="submit"]').click();
  return true;
}, empName);
await new Promise((r) => setTimeout(r, 3000));
await go(page, "/admin/hr/attendance");
const presentShown = await page.evaluate((name) => {
  const row = [...document.querySelectorAll("tr")].find((r) => r.innerText.includes(name));
  return row?.innerText.includes("Present") ?? false;
}, empName);
check("attendance marked by manager", marked && presentShown);

// ---- PARTNERS: referral becomes a payable reward ------------------------
await go(page, "/admin/reward-rules");
await page.evaluate(() => {
  const btn = [...document.querySelectorAll("button")].find((b) => /add reward rule/i.test(b.textContent ?? ""));
  btn?.click();
});
await page.waitForSelector('[role="dialog"] input[name="name"]', { timeout: 15000 });
await page.type('[role="dialog"] input[name="name"]', `Standard 10% ${STAMP}`);
await page.$eval('[role="dialog"] input[name="value"]', (el) => {
  const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  setter.call(el, "10");
  el.dispatchEvent(new Event("input", { bubbles: true }));
});
await page.click('[role="dialog"] button[type="submit"]');
await new Promise((r) => setTimeout(r, 2500));

await go(page, "/admin/partners");
const partnerName = `Referral Partner ${STAMP}`;
await fillAndSubmit(page, 'input[name="name"]', { name: partnerName, email: `partner.${STAMP}@example.com` });
await page.waitForFunction((n) => document.body.innerText.includes(n), { timeout: 25000 }, partnerName);
check("partner created with a referral code", await page.evaluate(() => /REFERR\d+|[A-Z]{3,}\d{2}/.test(document.body.innerText)));

await page.evaluate((clientId) => {
  const form = [...document.querySelectorAll("form")].find((f) => f.querySelector('input[name="dealValue"]'));
  const setSelect = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
  const setInput = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value").set;
  const client = form.querySelector('select[name="clientId"]');
  setSelect.call(client, clientId);
  client.dispatchEvent(new Event("change", { bubbles: true }));
  const value = form.querySelector('input[name="dealValue"]');
  setInput.call(value, "200000");
  value.dispatchEvent(new Event("input", { bubbles: true }));
  form.querySelector('button[type="submit"]').click();
}, clientId);
await new Promise((r) => setTimeout(r, 3000));
await go(page, "/admin/partners");

await page.evaluate(() => {
  const select = [...document.querySelectorAll('select[aria-label="Referral stage"]')].pop();
  if (select) {
    const setter = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, "value").set;
    setter.call(select, "WON");
    select.dispatchEvent(new Event("change", { bubbles: true }));
  }
});
await new Promise((r) => setTimeout(r, 4000));
await go(page, "/admin/partners");
const rewardShown = await page.evaluate(() => /₹\s?20,000/.test(document.body.innerText));
check("won referral calculated a 10% reward", rewardShown);

// ---- PORTAL: create a login, sign in as the client ----------------------
await go(page, "/admin/portal");
const portalEmail = `portal.${STAMP}@example.com`;
await fillAndSubmit(page, 'input[name="password"]', {
  clientId,
  name: "Client Contact",
  email: portalEmail,
  password: "portal-pass-1234",
});
await page.waitForFunction((e) => document.body.innerText.includes(e), { timeout: 25000 }, portalEmail);
check("portal login created", true);

const clientCtx = await browser.createBrowserContext();
const portal = await clientCtx.newPage();
await portal.setViewport({ width: 1440, height: 1000 });
await go(portal, "/portal/login");
await portal.type("#email", portalEmail);
await portal.type("#password", "portal-pass-1234");
await Promise.all([portal.waitForNavigation({ waitUntil: "networkidle0" }), portal.click('button[type="submit"]')]);
check("client signs into the portal", portal.url().endsWith("/portal"), portal.url());

await go(portal, "/portal/invoices");
const seesInvoice = await portal.evaluate((t) => document.body.innerText.includes(t), invoiceTitle);
check("client sees their own invoice", seesInvoice);

await go(portal, "/admin");
check("portal login cannot reach the admin panel", portal.url().includes("/admin/login"), portal.url());

await clientCtx.close();
await browser.close();

console.log(fails.length ? `\n${fails.length} check(s) failed` : "\nAll checks passed");
process.exit(fails.length ? 1 : 0);
