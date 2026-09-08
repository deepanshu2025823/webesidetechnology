# Sahab India — website & admin panel

Two things in one Next.js app:

1. **The public website** — fully dynamic and SEO-optimised, with every word,
   image and meta tag editable from the admin panel.
2. **The agency platform** — leads, clients, quotations, projects, milestones
   and tasks, from the project scope document, running inside the *same* admin
   panel with role-based access so the whole team can work in it.

**Stack:** Next.js 16 (App Router, React 19) · TypeScript · Tailwind CSS v4 ·
Prisma 7 · TiDB Cloud (MySQL protocol) · Sharp · Nodemailer

---

## Getting started

```bash
npm install          # also runs prisma generate
npm run db:push      # create/update tables on TiDB
npm run db:seed      # site settings, navigation, 14 services, pages, blog, portfolio
npm run dev          # http://localhost:3000
```

Admin panel: **/admin** — sign in with the credentials in `SEED_ADMIN_EMAIL` /
`SEED_ADMIN_PASSWORD`.

### Environment

Copy `.env.example` to `.env` and fill it in.

| Variable | Purpose |
| --- | --- |
| `DATABASE_URL` | TiDB Cloud MySQL connection string |
| `NEXT_PUBLIC_SITE_URL` | Canonical origin — used for canonicals, OG tags, sitemap |
| `AUTH_SECRET` | Signs the admin session cookie (`openssl rand -base64 48`) |
| `SEED_ADMIN_EMAIL` / `SEED_ADMIN_PASSWORD` | First super-admin, created by the seed |
| `SMTP_*`, `ENQUIRY_NOTIFY_TO` | Outbound email for enquiries, reminders and portal messages |
| `CRON_SECRET` | Bearer token protecting `/api/cron/daily` (optional but recommended) |

---

## Operations — the agency platform

All seven phases of the scope document, under `/admin`.

### Phase 1 — CRM and delivery

| Section | Covers |
| --- | --- |
| **Leads** | Website enquiries plus manual leads: pipeline stage, owner, score, follow-up dates, lost reasons, activity log, one-click conversion to a client |
| **Clients** | Company records with multiple contacts, tags, health score, account manager and a full communication timeline |
| **Quotations** | Line-item builder with service presets, per-line billing cycle, discount and GST; converts to a project or an invoice, and prints to PDF |
| **Projects** | Scope baseline (objectives, inclusions, exclusions, assumptions, acceptance criteria) with auto-versioning, milestones, health and budget |
| **Tasks** | Status board across the seven states from the scope document, with priority, assignee, due dates and milestone links |
| **Change requests** | Raise, price and approve scope changes — approval updates budget, end date and scope version automatically |

### Phase 2 — Finance and renewals

| Section | Covers |
| --- | --- |
| **Invoices** | Standard, proforma, milestone and recurring; quotation-to-invoice in one click; print/PDF carrying client contact, GSTIN, per-line billing cycle and the owner's bank/UPI/QR details; status follows the money |
| **Payments** | Mode, reference and date; part payments update the invoice status and balance automatically |
| **Credit notes** | Adjustments that reduce the payable amount |
| **Income & expenses** | One register for every rupee that does not move through an invoice — academy fees, placement commission, salaries, rent, subscriptions, ad spend — categorised per direction, attributed to a client, project or service, and marked settled or still due. An open entry carries a due date, an optional recurrence and a reminder the nightly sweep raises |
| **Receivables** | Outstanding totals and a 30/60/90-day ageing report |
| **Renewals** | Domains, hosting, SSL, AMC, retainers, ad management and wallet-based services, with reminders at 90/60/30/15/7/1 days, escalation past expiry, low-balance alerts and one-click invoicing |

### Phase 3 — Service operations

| Section | Covers |
| --- | --- |
| **Social calendars** | A plan per client per month; idea → copy → design → internal review → client approval → scheduled → published, with revision counts and monthly reporting |
| **SEO plans** | Keyword map with target URL, intent and position; monthly task list by category; backlink record; monthly reports |
| **Ad campaigns** | Meta and Google accounts, approval before launch, budget and management fee, daily performance entry, CPL and ROAS |
| **PR** | Objectives, media contacts, pitches and published coverage with reach |
| **Events** | Brief, budget, task board, vendors, sponsors, registrations, and attendee-to-lead capture |

### Phase 4 — Team and HR

| Section | Covers |
| --- | --- |
| **Employees** | Department, designation, skills and reporting line |
| **Attendance** | Explicit self or manager marking with correction — never inferred from device activity |
| **Leave** | Requests, approval, and approved leave writing through to attendance |
| **Payroll** | Salary structures with effective dates, draft payslips generated from structure and attendance, incentives and bonuses, approve-then-pay, and a printable payslip carrying the earnings breakdown and net pay in words |
| **Letters** | Offer, internship, experience, relieving, confirmation and appreciation letters. Wording is generated from the record so every certificate of a type reads alike; references are numbered per type per year (`SI/INT/2026/0004`) and each one prints on the company letterhead |

### Placements

| Section | Covers |
| --- | --- |
| **Candidates** | Academy students and outside applicants in one pipeline — CV uploaded and stored, skills, experience, expected CTC, notice period and status |
| **Placement partners** | The companies we place with: contact, the roles they are hiring for, our fee as a percentage of CTC, and the signed agreement |
| **Submissions** | One candidate put forward to one partner for one role, moved through sent → shortlisted → interview → offered → placed. An accepted offer marks the candidate placed |

### Phase 5 — Influencers and partners

| Section | Covers |
| --- | --- |
| **Influencers** | Master database: niche, platforms, audience, rate card, compliance and internal rating |
| **Collaborations** | Deliverables, dates, cost, paid amount and status per campaign |
| **Referral partners** | Unique referral codes, referral pipeline, and rewards calculated from configurable rules on a won deal |
| **Reward rules** | Percentage, fixed or slab, payable on deal won or invoice paid, with approval before payout |

### Phase 6 — Notifications, messaging and integrations

| Section | Covers |
| --- | --- |
| **Notifications** | In-app inbox for every alert: task due and overdue, lead follow-ups, renewals, overdue invoices, approvals, rewards |
| **Message templates** | Email, WhatsApp and SMS copy with `{{placeholders}}` |
| **Integrations** | Credential storage and enable switches for WhatsApp, SMS, IVR, Meta Ads, Google Ads, payment gateway, Google Calendar and accounting |
| **Automation** | `/api/cron/daily` runs the renewal, invoice, money-reminder and task sweeps; "Run now" triggers the same code from admin. Each reminder fires once a day per record, however often the sweep runs |

### Phase 7 — Client portal and analytics

| Section | Covers |
| --- | --- |
| **Client portal** | A separate login at `/portal` where clients see their projects and milestones, approve work, view invoices, download shared documents and raise requests |
| **Approvals** | Sign-off checkpoints raised from admin, decided in the portal, with comments back to the team |
| **Documents** | Filed by client → service → project, with version history and per-file client visibility |
| **Reports** | Live management, sales, delivery, finance, renewals, ads, social, SEO, team and partner boards |

### Roles

Ten roles from section 3 of the scope document. Each one sees only the modules
it needs; the matrix lives in `src/lib/permissions.ts` and drives the sidebar,
the route guard in `src/middleware.ts` and every server action.

| Role | Reaches |
| --- | --- |
| Super Admin / CEO | Everything, including settings and team access |
| Director / Management | Clients, projects, delivery, reports |
| Sales / Business Development | Leads, quotations, client onboarding |
| Project / Account Manager | Clients, project scopes, milestones, tasks |
| Service Team Lead | Assigned projects, task review |
| Team Member | Only their own assigned tasks |
| Finance / Accounts | Read access to clients, quotations, projects |
| HR / Admin | Employees, attendance, leave, payroll, letters and placements |
| Influencer / Partner Manager | Influencers, referral partners, campaigns and events |
| Website Editor | Website content only |

Add someone under **Team access**, pick a role, and the panel reshapes itself
for them.

---

## Website content

Everything below is editable in `/admin` and appears on the site immediately.

| Section | Covers |
| --- | --- |
| **Subscribers** | Newsletter sign-ups, exportable to CSV |
| **Services** | Full landing page per service: content, features, workflow, pricing, deliverables, SEO |
| **Portfolio** | Case studies with challenge, solution, gallery, outcome numbers, linked services and tags. The public page filters by published service and by tag, counted live from what is on it |
| **Blog** | Posts with a rich-text editor, categories, tags, scheduling and per-post SEO |
| **Pages** | Standalone pages (About, Privacy, Terms) on their own URLs |
| **Home page** | Hero slides, stats, process steps, testimonials, client logos, FAQs |
| **Site** | Team, navigation menus, media library, admin users |
| **Video carousel** | Reels and Shorts in 9:16 by default (switchable to 16:9), playing in a lightbox with a link out to the source |
| **Chatbot training** | What the site assistant answers: one row per question with the words that trigger it, the reply, follow-up chips, and an optional override of a built-in topic. Services, pricing, portfolio and contact still answer from live site data unless a row claims them |
| **Settings & SEO** | Brand, logos, contact details, billing & payments (GSTIN, PAN, bank, UPI + QR), socials, CTA band, chat assistant copy, default metadata, analytics, index switch |

---

## SEO

- Per-page `title`, meta description and keywords, editable in admin with a live
  Google-result preview.
- Canonical URLs, Open Graph and Twitter card tags on every page.
- JSON-LD: `Organization`/`ProfessionalService`, `WebSite`, `BreadcrumbList`,
  `Service`, `CreativeWork`, `BlogPosting` and `FAQPage`.
- `sitemap.xml` generated from live content; `robots.txt` with a single
  "allow indexing" switch in settings (turn it off for staging).
- Static generation with a 5-minute revalidate window; admin edits revalidate the
  public routes immediately.
- WebP conversion and responsive `srcset` on every uploaded image.

---

## Brand assets

`scripts/build-brand-assets.mjs` turns the supplied logo into the site's asset
set — it keys out the background, keeps the gold and navy exact, and emits:

```
public/brand/logo.png             transparent lockup, light backgrounds
public/brand/logo-light.png       navy ink repainted cream, for dark backgrounds
public/brand/logo-mark.png        crown mark only
public/brand/logo-mark-light.png  crown mark, cream ink
public/brand/icon-192.png · icon-512.png · og-default.png
public/favicon.ico                16/32/48 px
src/app/icon.png · src/app/apple-icon.png
```

Re-run after a logo change: `npm run brand:assets -- path/to/logo.png`

Palette sampled from the artwork: gold `#b48c24`, navy `#0f1a3c`.

---

## Photography

Seed content ships with 32 curated photographs in `public/uploads/stock`,
fetched and optimised by `scripts/fetch-stock-images.mjs`.

- **Source:** Unsplash. The Unsplash License allows commercial use with no
  permission or attribution required.
- Every image was reviewed by eye before inclusion; anything carrying a
  third-party logo or brand mark was rejected.
- `public/uploads/stock/CREDITS.json` records the source URL for each file so
  any image can be traced or swapped.
- All are pre-cropped and converted to WebP (heroes 1600×900, cards 1200×750,
  portraits 700×700).

The client can replace any of them from the admin panel — every image field has
an upload button, and uploads are converted to WebP automatically.

```bash
node scripts/fetch-stock-images.mjs   # re-download / re-optimise the set
```

---

## Scripts

| Command | Does |
| --- | --- |
| `npm run dev` | Development server on **http://**localhost:3000 |
| `npm run dev:https` | Same, over https://localhost:3000 (self-signed certificate) |
| `npm run build` / `npm start` | Production build and server |
| `npm run db:push` | Sync the Prisma schema to TiDB |
| `npm run db:seed` | Seed/refresh site content (safe to re-run) |
| `npm run db:studio` | Browse the database |
| `npm run brand:assets -- <logo>` | Rebuild logo and favicon variants |
| `node scripts/audit.mjs /path …` | Check pages for overflow, broken or distorted images, console errors (`WIDTHS=`, `BASE=`, `ADMIN_COOKIE=`) |
| `node scripts/screenshots.mjs /path@mobile …` | Full-page screenshots |
| `node scripts/e2e.mjs` | Website flow: sign in, publish content, confirm it goes live, clean up |
| `node scripts/e2e-crm.mjs` | Phase 1 flow: client → contact → quotation → project → milestone → task → change request, plus role gating |
| `node scripts/e2e-platform.mjs` | Phases 2–7: invoice → payment, renewal reminders, content calendar, HR, partner rewards, client portal |
| `npx tsx scripts/e2e-cleanup.mjs` | Removes every record the test suites create |
| `node scripts/fetch-stock-images.mjs` | Re-fetch the curated seed photography |

---

## Third-party credentials

Every integration is built and wired; the ones below need an account before they
can send anything live. Until then the platform records a `SKIPPED` message log
rather than failing silently, so nothing disappears.

| Needs credentials | Where to add them |
| --- | --- |
| WhatsApp Business (Meta), SMS gateway, IVR | Admin → Integrations |
| Meta Ads, Google Ads reporting sync | Admin → Integrations |
| Payment gateway, Google Calendar, accounting | Admin → Integrations |
| Email | `SMTP_*` environment variables (already configured) |

Ad, SEO and social metrics are entered manually today, exactly as the scope
document anticipates, and the same tables accept an API sync later.

---

## Notes for deployment

- Set `NEXT_PUBLIC_SITE_URL` to the live origin, or canonicals and the sitemap
  will point at localhost.
- Replace `AUTH_SECRET` and the seeded admin password before going live.
- Uploads are written to `public/uploads`. On a platform with an ephemeral
  filesystem, point `src/app/api/upload/route.ts` at object storage instead.
- TiDB needs TLS and a generous connect timeout; both live in
  `src/lib/db-config.ts`.
