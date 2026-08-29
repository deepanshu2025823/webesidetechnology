/**
 * Seeds Sahab India's site content: an admin login, site settings,
 * navigation, and the full service catalogue with the delivery workflows from
 * the project scope document.
 *
 * Safe to re-run - everything upserts on a stable slug or id.
 */
import "dotenv/config";
import { PrismaMariaDb } from "@prisma/adapter-mariadb";
import { PrismaClient } from "../src/generated/prisma/client";
import { mariaDbConfig } from "../src/lib/db-config";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient({ adapter: new PrismaMariaDb(mariaDbConfig()) });

/** Curated stock photography, fetched by scripts/fetch-stock-images.mjs. */
const IMG = (name: string) => `/uploads/stock/${name}.webp`;

const step = (title: string, description: string) => ({ title, description });
const feature = (title: string, description: string) => ({ title, description });

async function main() {
  // ---------------------------------------------------------------- admin user
  const email = (process.env.SEED_ADMIN_EMAIL ?? "admin@sahabindia.com").toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD ?? "SahabIndia@2026";

  const admin = await prisma.user.upsert({
    where: { email },
    update: { role: "SUPER_ADMIN", isActive: true },
    create: {
      name: "Sahab India Admin",
      email,
      passwordHash: await bcrypt.hash(password, 12),
      role: "SUPER_ADMIN",
    },
  });
  console.log(`admin ready: ${email}`);

  // ---------------------------------------------------------------- settings
  const settings = {
    siteName: "Sahab India",
    tagline: "Web • Apps • Marketing • Growth",
    description:
      "Sahab India is a full-service IT and digital marketing agency. We build websites, portals and mobile apps, then run the SEO, social and paid campaigns that turn them into pipeline.",
    logoLight: "/brand/logo.png",
    logoDark: "/brand/logo-light.png",
    logoMark: "/brand/logo-mark-light.png",
    ogImage: "/brand/og-default.png",
    email: "info@sahabindia.com",
    altEmail: "sales@sahabindia.com",
    phone: "+91 98765 43210",
    altPhone: "",
    whatsapp: "+919876543210",
    addressLine: "Sector 62",
    city: "Noida",
    state: "Uttar Pradesh",
    postalCode: "201301",
    country: "India",
    mapEmbedUrl: "",
    workingHours: "Mon – Sat, 10:00 – 19:00 IST",
    facebook: "https://facebook.com/sahabindia",
    instagram: "https://instagram.com/sahabindia",
    linkedin: "https://linkedin.com/company/sahabindia",
    twitter: "",
    youtube: "",
    footerAbout:
      "One accountable team for technology and growth — websites, apps, portals, SEO, social, paid media, PR and events.",
    ctaTitle: "Ready to grow your business online?",
    ctaSubtitle:
      "Tell us the goal. We'll come back with an approach, a timeline and an honest price — usually within one working day.",
    ctaButton: "Book a free consultation",
    ctaUrl: "/contact",
    metaTitle: "Sahab India — IT & Digital Marketing Agency in Noida",
    metaDescription:
      "Website and app development, web portals, SEO, social media, Meta and Google Ads, PR, events and business communication services — delivered by one accountable team.",
    metaKeywords:
      "digital marketing agency, web development company, seo services, app development, meta ads, google ads, noida",
    schemaOrgType: "ProfessionalService",
    foundingYear: "2019",
    robotsIndexable: true,
  };

  await prisma.siteSettings.upsert({ where: { id: 1 }, update: settings, create: { id: 1, ...settings } });

  // ---------------------------------------------------------------- categories
  const categories = [
    {
      slug: "technology",
      name: "Technology & Development",
      icon: "Code2",
      order: 1,
      description: "Websites, portals, apps and integrations built to be fast, secure and easy to run.",
    },
    {
      slug: "digital-marketing",
      name: "Digital Marketing",
      icon: "TrendingUp",
      order: 2,
      description: "Search, social and content programmes that compound month after month.",
    },
    {
      slug: "advertising",
      name: "Paid Advertising",
      icon: "Megaphone",
      order: 3,
      description: "Meta and Google campaigns managed against cost-per-lead, not vanity metrics.",
    },
    {
      slug: "brand-communication",
      name: "PR, Events & Communication",
      icon: "Send",
      order: 4,
      description: "Press coverage, event marketing and the messaging channels that reach customers directly.",
    },
  ];

  const categoryIds: Record<string, string> = {};
  for (const c of categories) {
    const row = await prisma.serviceCategory.upsert({ where: { slug: c.slug }, update: c, create: c });
    categoryIds[c.slug] = row.id;
  }

  // ---------------------------------------------------------------- services
  const services = [
    {
      slug: "web-development",
      coverImage: IMG("service-web-development"),
      title: "Web Development",
      category: "technology",
      icon: "Code2",
      order: 1,
      isFeatured: true,
      priceFrom: 45000,
      priceUnit: "project",
      shortDescription:
        "Fast, secure, search-ready websites — corporate sites, e-commerce and landing pages built on modern frameworks.",
      heroTitle: "Websites that load fast and sell harder",
      heroSubtitle:
        "From a five-page brochure site to a full e-commerce build, we design, develop and launch on a fixed scope with a fixed date.",
      content:
        "<p>Your website is usually the first serious conversation a customer has with your business. We build sites that make that conversation easy: clear structure, quick loading, honest copy and a path to enquiry on every page.</p><h2>Built on a modern stack</h2><p>We work with Next.js, React and headless content management so your site is quick on mobile, easy for search engines to crawl, and simple for your team to update without calling a developer.</p><h2>You own everything</h2><p>Source code, domain, hosting and analytics stay in your name from day one. No lock-in, no hostage situations.</p>",
      features: [
        feature("Custom UI/UX design", "Wireframes and visual design tailored to your brand, reviewed before a line of code is written."),
        feature("Mobile-first build", "Every layout is designed for the phone first, because that is where most of your traffic is."),
        feature("SEO foundations", "Clean markup, structured data, sitemaps and Core Web Vitals handled at build time."),
        feature("CMS you can actually use", "Update text, images, blogs and SEO fields yourself through a simple admin panel."),
        feature("Security & backups", "SSL, hardened hosting, automated backups and a documented recovery plan."),
        feature("Post-launch support", "Thirty days of free fixes, then an optional AMC for ongoing updates."),
      ],
      processSteps: [
        step("Requirement & scope", "We document objectives, inclusions, exclusions and acceptance criteria in writing."),
        step("Quotation & approval", "A fixed-price quotation with a milestone schedule you sign off before work starts."),
        step("UI/UX design", "Wireframes then high-fidelity designs, revised until you approve them."),
        step("Development", "Weekly builds on a staging URL so you see progress rather than hear about it."),
        step("Testing & client approval", "Cross-browser, cross-device and performance testing, then your final sign-off."),
        step("Deployment & handover", "Go-live, analytics setup, source files, credentials and a walkthrough for your team."),
        step("AMC & renewal", "Optional maintenance covering updates, backups, domain and hosting renewals."),
      ],
      deliverables: [
        "Responsive website on your domain",
        "Admin panel with training",
        "On-page SEO setup",
        "Google Analytics & Search Console",
        "Source code & documentation",
        "30 days post-launch support",
      ],
      metaTitle: "Web Development Company in Noida | Sahab India",
      metaDescription:
        "Custom website development for businesses — corporate sites, e-commerce and landing pages. Fast, secure, SEO-ready and fully manageable by your own team.",
      metaKeywords: "web development company, website design noida, ecommerce development, custom website",
    },
    {
      slug: "app-development",
      coverImage: IMG("service-app-development"),
      title: "App Development",
      category: "technology",
      icon: "Smartphone",
      order: 2,
      isFeatured: true,
      priceFrom: 150000,
      priceUnit: "project",
      shortDescription:
        "Android and iOS apps — native or cross-platform — taken from requirement to store release and beyond.",
      heroTitle: "Mobile apps your customers keep on the home screen",
      heroSubtitle:
        "Scoped module by module, built in sprints, tested properly and shipped to both stores with release support.",
      content:
        "<p>We build apps for businesses that need one — delivery, booking, membership, field teams, commerce — not apps for the sake of having an app.</p><h2>Scoped in modules</h2><p>Before development starts we agree the module list, the platforms and the release plan. That way you know what you are paying for and what lands in each sprint.</p><h2>Tested before you see it</h2><p>QA runs alongside development, followed by a UAT round on real devices with your team before anything goes to the stores.</p>",
      features: [
        feature("Android & iOS", "Cross-platform builds by default; native where the use case demands it."),
        feature("Module-based scope", "A written module list with estimates, so change requests are priced transparently."),
        feature("API & backend", "Secure REST APIs, role-based access and an admin dashboard to run the app."),
        feature("Store release support", "Listing copy, screenshots, policy compliance and submission handled for you."),
        feature("Analytics & crash reporting", "Know what users do and where the app breaks, from day one."),
        feature("Maintenance plans", "OS updates, library upgrades and feature releases on a monthly retainer."),
      ],
      processSteps: [
        step("Requirement & platform", "Decide the platforms, the module list and the release milestones."),
        step("UI/UX design", "Screen flows and visual design approved before development."),
        step("Development", "Sprint-based builds with a testable version at the end of each sprint."),
        step("QA", "Functional, device and performance testing by a separate reviewer."),
        step("UAT", "Your team tests against the agreed acceptance criteria."),
        step("Store release", "Play Store and App Store submission, review responses and launch."),
        step("Maintenance", "Ongoing updates, monitoring and feature releases."),
      ],
      deliverables: [
        "Android and/or iOS application",
        "Admin dashboard",
        "API documentation",
        "Store listings and release",
        "Source code handover",
        "Post-launch support window",
      ],
      metaTitle: "Mobile App Development Company | Android & iOS | Sahab India",
      metaDescription:
        "Android and iOS app development from requirement to store release — module-based scope, sprint delivery, QA, UAT and ongoing maintenance.",
      metaKeywords: "mobile app development, android app development, ios app development company",
    },
    {
      slug: "web-portals-custom-software",
      coverImage: IMG("service-web-portals"),
      title: "Web Portals & Custom Software",
      category: "technology",
      icon: "LayoutDashboard",
      order: 3,
      isFeatured: true,
      priceFrom: 200000,
      priceUnit: "project",
      shortDescription:
        "CRMs, dashboards, booking systems and internal tools that replace the spreadsheets your team has outgrown.",
      heroTitle: "Software shaped around how your business actually runs",
      heroSubtitle:
        "Requirement gathering, functional scope, milestones and UAT — the discipline that keeps custom builds on time.",
      content:
        "<p>When a business grows past spreadsheets and WhatsApp groups, the fix is usually a portal that gives every record an owner and every process a status.</p><h2>Functional scope first</h2><p>We write the functional scope — modules, roles, permissions, workflows and reports — and agree it before estimating. That document becomes the baseline everything is measured against.</p><h2>Built to be handed over</h2><p>API-first architecture, documented endpoints and a role-based admin, so another team could pick it up if they ever needed to.</p>",
      features: [
        feature("Requirement workshops", "Sessions with the people who will use the system, not just the people who buy it."),
        feature("Role-based access", "Granular permissions so finance, delivery and management each see only what they should."),
        feature("Workflow automation", "Approvals, reminders, escalations and status changes handled by the system."),
        feature("Reporting dashboards", "The numbers management actually asks for, refreshed in real time."),
        feature("Third-party integrations", "Payment gateways, messaging APIs, accounting tools and provider APIs."),
        feature("Scalable architecture", "Built to grow with more users, more clients and more data."),
      ],
      processSteps: [
        step("Requirement gathering", "Workshops with each user group to map the current process."),
        step("Functional scope", "A written specification of modules, roles, workflows and reports."),
        step("Module planning", "Modules grouped into milestones with dates and owners."),
        step("Development", "Milestone builds on staging with a demo at the end of each one."),
        step("Testing", "Functional and integration testing before every handover."),
        step("UAT", "Your team signs off against the acceptance criteria."),
        step("Deployment & support", "Go-live, data migration, training and an ongoing support plan."),
      ],
      deliverables: [
        "Functional scope document",
        "Web portal with role-based access",
        "Admin & reporting dashboards",
        "API documentation",
        "Deployment and data migration",
        "Team training",
      ],
      metaTitle: "Custom Software & Web Portal Development | Sahab India",
      metaDescription:
        "Custom web portals, CRMs, dashboards and internal tools — requirement gathering, functional scope, milestone delivery, UAT and support.",
      metaKeywords: "custom software development, web portal development, crm development company",
    },
    {
      slug: "seo-services",
      coverImage: IMG("service-seo"),
      title: "SEO Services",
      category: "digital-marketing",
      icon: "Search",
      order: 4,
      isFeatured: true,
      priceFrom: 25000,
      priceUnit: "month",
      shortDescription:
        "Technical fixes, keyword strategy, content and clean link building — reported against rankings and traffic every month.",
      heroTitle: "Search traffic that keeps paying after the invoice",
      heroSubtitle:
        "A monthly programme with a written plan, a keyword map, a task log and a report you can hold us to.",
      content:
        "<p>SEO is not a mystery, it is a checklist run consistently. We audit what is broken, fix the technical foundation, target keywords that actually convert, and publish content that deserves to rank.</p><h2>What the monthly retainer covers</h2><p>Technical fixes, on-page optimisation, content briefs, local SEO where relevant, and off-page outreach — logged so you can see exactly what was done.</p><h2>Honest reporting</h2><p>You get rankings, traffic, conversions and the worklog. If a keyword set is not moving, we say so and change the plan.</p>",
      features: [
        feature("Technical audit", "Crawlability, speed, indexing, schema and Core Web Vitals, prioritised by impact."),
        feature("Keyword strategy", "A keyword map with target URLs, intent and current versus target positions."),
        feature("On-page optimisation", "Titles, meta, headings, internal links and content depth on priority pages."),
        feature("Content programme", "Briefs and articles written for search intent, not word count."),
        feature("Local SEO", "Google Business Profile, citations and location pages for service-area businesses."),
        feature("Monthly reporting", "Rankings, traffic, conversions and the full worklog, every month."),
      ],
      processSteps: [
        step("Website audit", "A full technical and content audit with a prioritised fix list."),
        step("Keyword plan", "Keyword research mapped to pages, intent and business value."),
        step("On-page work", "Metadata, headings, internal linking and content improvements."),
        step("Technical fixes", "Speed, indexing, schema and crawl issues resolved."),
        step("Off-page & content", "Editorial content and clean, relevant link acquisition."),
        step("Monthly tasks", "A recurring checklist executed and logged every cycle."),
        step("Reporting & renewal", "Rankings and traffic reviewed, next quarter's plan agreed."),
      ],
      deliverables: [
        "Technical SEO audit",
        "Keyword map with target URLs",
        "Monthly optimisation worklog",
        "Content briefs and articles",
        "Backlink and outreach record",
        "Monthly rankings & traffic report",
      ],
      metaTitle: "SEO Services & Agency in Noida | Sahab India",
      metaDescription:
        "Monthly SEO retainers covering technical fixes, keyword strategy, on-page, content and off-page work — with transparent rankings and traffic reporting.",
      metaKeywords: "seo services, seo company noida, local seo, technical seo agency",
    },
    {
      slug: "social-media-marketing",
      coverImage: IMG("service-social-media"),
      title: "Social Media Marketing",
      category: "digital-marketing",
      icon: "Share2",
      order: 5,
      isFeatured: true,
      priceFrom: 20000,
      priceUnit: "month",
      shortDescription:
        "Strategy, monthly content calendars, design and video, publishing and engagement across every channel that matters.",
      heroTitle: "A social presence that looks like a brand, not an afterthought",
      heroSubtitle:
        "One calendar, approved in advance, produced on time and reported at the end of every month.",
      content:
        "<p>Most social accounts fail on consistency, not creativity. We fix that with a monthly calendar agreed in advance, a production line for design and video, and a publishing schedule that does not slip.</p><h2>Approval before publishing</h2><p>Every post — copy, design and caption — goes through your approval inside a shared calendar before it goes live.</p><h2>Reported monthly</h2><p>Reach, impressions, engagement, follower growth and the deliverables completed against what was contracted.</p>",
      features: [
        feature("Channel strategy", "Which platforms deserve your budget, and what each one is for."),
        feature("Monthly content calendar", "Every post planned, written and designed before the month begins."),
        feature("Design & video production", "Statics, carousels, reels and stories produced in-house."),
        feature("Approval workflow", "Comments and revisions tracked, so nothing goes live unapproved."),
        feature("Community management", "Comments and DMs answered within agreed response times."),
        feature("Monthly report", "Reach, engagement, growth and deliverables versus contract."),
      ],
      processSteps: [
        step("Strategy", "Audience, positioning, channel mix and content pillars."),
        step("Content plan", "Themes and formats mapped across the month."),
        step("Monthly calendar", "Dated calendar with copy and creative direction per post."),
        step("Design & video", "Production of statics, carousels and reels."),
        step("Client approval", "Your review and sign-off inside the calendar."),
        step("Publishing & engagement", "Scheduled publishing plus community management."),
        step("Monthly report", "Performance review and next month's plan."),
      ],
      deliverables: [
        "Channel strategy document",
        "Monthly content calendar",
        "Designed posts, reels and stories",
        "Scheduled publishing",
        "Community management",
        "Monthly performance report",
      ],
      metaTitle: "Social Media Marketing Agency | Instagram, Facebook, LinkedIn",
      metaDescription:
        "Social media management with monthly content calendars, design and video production, approvals, publishing, engagement and transparent reporting.",
      metaKeywords: "social media marketing agency, instagram marketing, social media management company",
    },
    {
      slug: "meta-ads",
      coverImage: IMG("service-meta-ads"),
      title: "Meta Ads",
      category: "advertising",
      icon: "Megaphone",
      order: 6,
      isFeatured: true,
      priceFrom: 20000,
      priceUnit: "month",
      shortDescription:
        "Facebook and Instagram campaigns built around audiences and creative, optimised against cost per lead.",
      heroTitle: "Meta campaigns judged on leads, not likes",
      heroSubtitle:
        "Campaign brief, audience build, creative, launch approval, then continuous optimisation and honest reporting.",
      content:
        "<p>Meta advertising works when the offer, the audience and the creative are matched — and when someone reviews the numbers often enough to act on them.</p><h2>Your ad account, your data</h2><p>Campaigns run inside your own Business Manager. You keep the audiences, the pixel data and the creative library.</p><h2>Optimised weekly</h2><p>Budget pacing, audience refresh and creative rotation reviewed on a fixed cadence, with spend, leads and CPL reported against target.</p>",
      features: [
        feature("Campaign strategy", "Objectives, funnel stages and budget allocation agreed up front."),
        feature("Audience building", "Interest, lookalike and retargeting audiences built from your own data."),
        feature("Creative production", "Ad creative and copy variants produced and tested, not recycled."),
        feature("Pixel & conversion tracking", "Events, conversions API and attribution set up correctly."),
        feature("Weekly optimisation", "Budget pacing, bid strategy and creative rotation reviewed regularly."),
        feature("Lead & ROI reporting", "Spend, leads, CPL, conversions and return, reported monthly."),
      ],
      processSteps: [
        step("Campaign brief", "Objective, offer, budget and success metrics agreed in writing."),
        step("Audience", "Audience research and segment build inside your ad account."),
        step("Creative", "Ad copy, statics and video produced for each segment."),
        step("Campaign setup", "Structure, tracking and budgets configured."),
        step("Approval", "You approve creative and budget before anything goes live."),
        step("Launch & optimisation", "Go live, then continuous testing and refinement."),
        step("Reporting & billing", "Lead and sales reporting against spend, monthly."),
      ],
      deliverables: [
        "Campaign strategy and structure",
        "Audience segments",
        "Ad creative and copy",
        "Pixel and conversion tracking",
        "Weekly optimisation",
        "Monthly performance report",
      ],
      metaTitle: "Meta Ads Agency | Facebook & Instagram Advertising Management",
      metaDescription:
        "Facebook and Instagram ad management — audience research, creative production, conversion tracking, weekly optimisation and CPL-focused reporting.",
      metaKeywords: "meta ads agency, facebook ads management, instagram advertising company",
    },
    {
      slug: "google-ads",
      coverImage: IMG("service-google-ads"),
      title: "Google Ads",
      category: "advertising",
      icon: "Target",
      order: 7,
      isFeatured: true,
      priceFrom: 20000,
      priceUnit: "month",
      shortDescription:
        "Search, display, shopping and YouTube campaigns with proper conversion tracking and weekly optimisation.",
      heroTitle: "Capture the demand that is already searching",
      heroSubtitle:
        "Keyword and ad planning, clean campaign structure, conversion tracking and a report that separates spend from results.",
      content:
        "<p>Google Ads rewards structure and discipline: tight keyword groups, relevant landing pages, correct conversion tracking and someone checking the search terms report every week.</p><h2>Set up to be measured</h2><p>Before launch we make sure conversions actually fire — calls, forms, purchases — so optimisation decisions are based on real outcomes.</p><h2>Wasted spend removed</h2><p>Negative keyword lists, bid adjustments and ad-group restructuring are ongoing, not one-time work.</p>",
      features: [
        feature("Keyword & ad planning", "Search volume, intent and competition mapped to campaign structure."),
        feature("Campaign build", "Search, display, shopping, Performance Max and YouTube as the goal requires."),
        feature("Conversion tracking", "Calls, forms and purchases tracked through Google Ads and GA4."),
        feature("Landing page guidance", "Recommendations — and builds where needed — to lift conversion rate."),
        feature("Weekly optimisation", "Search terms, negatives, bids and ad copy reviewed every week."),
        feature("Transparent reporting", "Spend, clicks, CPC, conversions, CPA and ROI, monthly."),
      ],
      processSteps: [
        step("Keyword & ad plan", "Research, grouping and ad copy written for each group."),
        step("Campaign setup", "Account structure, budgets and targeting configured."),
        step("Tracking", "Conversion actions and GA4 linkage verified before launch."),
        step("Approval", "Budget, keywords and copy approved by you."),
        step("Launch", "Campaigns go live with a controlled ramp-up."),
        step("Optimisation", "Weekly search-term review, negatives and bid management."),
        step("Reporting", "Search, display and video performance reported monthly."),
      ],
      deliverables: [
        "Keyword plan and campaign structure",
        "Ad copy and extensions",
        "Conversion tracking setup",
        "Weekly optimisation log",
        "Landing page recommendations",
        "Monthly performance report",
      ],
      metaTitle: "Google Ads Management Agency | PPC Services | Sahab India",
      metaDescription:
        "Google Ads management — keyword planning, campaign setup, conversion tracking, weekly optimisation and clear reporting on spend, leads and CPA.",
      metaKeywords: "google ads agency, ppc management company, google ads management services",
    },
    {
      slug: "pr-services",
      coverImage: IMG("service-pr"),
      title: "PR Services",
      category: "brand-communication",
      icon: "Newspaper",
      order: 8,
      isFeatured: false,
      priceFrom: 40000,
      priceUnit: "month",
      shortDescription:
        "Media lists, press material, journalist outreach and publication tracking — with clippings you can show the board.",
      heroTitle: "Coverage in the publications your customers read",
      heroSubtitle:
        "A PR objective, a targeted media list, a story worth printing and pitching that follows through.",
      content:
        "<p>Press coverage still moves trust faster than almost any paid channel. The work is unglamorous: a sharp angle, the right journalist and persistent, polite follow-up.</p><h2>Built around a story, not a template</h2><p>We start with the objective — a launch, a funding round, a milestone, an opinion — and build the press material around what an editor would actually run.</p>",
      features: [
        feature("PR strategy", "Objectives, key messages and the angles worth pitching."),
        feature("Targeted media list", "Publications and journalists who cover your sector, not a bulk blast."),
        feature("Press material", "Releases, founder quotes, backgrounders and image assets."),
        feature("Pitching & follow-up", "Direct outreach with tracked follow-ups."),
        feature("Publication tracking", "Every placement logged with reach and link value."),
        feature("Clipping report", "A coverage report at the end of every cycle."),
      ],
      processSteps: [
        step("PR objective", "Agree what the campaign is for and what success looks like."),
        step("Media list", "Build a targeted list of relevant publications and journalists."),
        step("Story & press material", "Write the release and supporting assets."),
        step("Pitching", "Outreach, follow-ups and interview coordination."),
        step("Publication tracking", "Log placements as they go live."),
        step("Clipping report", "Coverage, reach and link value reported."),
      ],
      deliverables: [
        "PR strategy and messaging",
        "Targeted media list",
        "Press releases and assets",
        "Journalist outreach",
        "Coverage tracking",
        "Clipping report",
      ],
      metaTitle: "PR Agency & Public Relations Services | Sahab India",
      metaDescription:
        "Public relations services — PR strategy, media lists, press releases, journalist outreach, publication tracking and coverage reporting.",
      metaKeywords: "pr agency, public relations services, press release distribution india",
    },
    {
      slug: "event-marketing",
      coverImage: IMG("service-events"),
      title: "Event Marketing & Management",
      category: "brand-communication",
      icon: "CalendarDays",
      order: 9,
      isFeatured: false,
      priceFrom: 75000,
      priceUnit: "project",
      shortDescription:
        "Event planning, promotion, registrations, vendors and sponsors — through to execution and a post-event report.",
      heroTitle: "Events that fill the room and follow up afterwards",
      heroSubtitle:
        "Budget, vendors, promotion, registrations and logistics run on one board, with lead capture built in.",
      content:
        "<p>An event is a project with a hard deadline. We run it like one: a budget, a vendor list, a promotion calendar and a registration pipeline that is reviewed weekly.</p><h2>Promotion across every channel</h2><p>Social, ads, PR, influencers and WhatsApp campaigns coordinated on a single marketing calendar aimed at registrations.</p><h2>The follow-up matters most</h2><p>Attendee data, lead capture and a post-event report so the pipeline created is actually worked.</p>",
      features: [
        feature("Event planning", "Objectives, budget, format, venue and the team responsible."),
        feature("Vendor & sponsor management", "Quotations, contracts, payments and sponsorship packages."),
        feature("Promotion campaign", "Coordinated social, ads, PR, influencer and messaging push."),
        feature("Registration management", "Registration pages, attendee database and reminder messaging."),
        feature("On-ground execution", "Logistics, run-of-show and coordination on the day."),
        feature("Post-event reporting", "Attendance, leads captured and follow-up plan."),
      ],
      processSteps: [
        step("Event brief", "Objectives, audience, format and success metrics."),
        step("Budget", "A line-item budget agreed before commitments are made."),
        step("Vendors & partners", "Sourcing, quotations and contracting."),
        step("Promotion plan", "A dated marketing calendar across every channel."),
        step("Registrations", "Registration flow, reminders and attendee database."),
        step("Logistics & execution", "Run-of-show, on-ground coordination and delivery."),
        step("Post-event report", "Attendance, leads and follow-up recommendations."),
      ],
      deliverables: [
        "Event plan and budget",
        "Vendor and sponsor coordination",
        "Promotion campaign",
        "Registration and attendee database",
        "On-ground execution",
        "Post-event report with leads",
      ],
      metaTitle: "Event Marketing & Management Company | Sahab India",
      metaDescription:
        "End-to-end event marketing and management — planning, budgets, vendors, sponsors, promotion, registrations, execution and post-event reporting.",
      metaKeywords: "event management company, event marketing agency, corporate event planners",
    },
    {
      slug: "blog-content-writing",
      coverImage: IMG("service-content"),
      title: "Blog & Content Writing",
      category: "digital-marketing",
      icon: "PenLine",
      order: 10,
      isFeatured: false,
      priceFrom: 15000,
      priceUnit: "month",
      shortDescription:
        "Research-led articles written for search intent — briefed, drafted, SEO-checked, approved and published.",
      heroTitle: "Content that earns rankings and reads like a human wrote it",
      heroSubtitle:
        "A topic and keyword brief, a named writer, an SEO/QC pass and publishing on your site — every month.",
      content:
        "<p>Publishing consistently is the cheapest durable marketing there is. The catch is that thin, generic articles do nothing. We brief writers properly and edit before anything goes live.</p><h2>Briefed for intent</h2><p>Each article starts with a target keyword, the search intent behind it, the questions to answer and the internal links to include.</p>",
      features: [
        feature("Topic & keyword briefs", "Every article mapped to a keyword and a stage of the funnel."),
        feature("Specialist writers", "Writers assigned by sector, not a general pool."),
        feature("SEO & quality check", "Structure, keyword usage, readability and originality reviewed."),
        feature("Client approval", "Drafts shared for approval before publishing."),
        feature("Publishing & formatting", "Uploaded, formatted, internally linked and indexed."),
        feature("Performance reporting", "Rankings and traffic per article, monthly."),
      ],
      processSteps: [
        step("Topic & keyword brief", "Research and brief creation for each article."),
        step("Writer assignment", "Matched to a writer with relevant subject knowledge."),
        step("Draft", "First draft delivered against the brief."),
        step("SEO & QC", "Editorial and SEO review before it leaves us."),
        step("Client approval", "Your review and sign-off."),
        step("Publishing", "Uploaded, formatted and submitted for indexing."),
        step("Reporting", "Traffic and ranking performance reviewed monthly."),
      ],
      deliverables: [
        "Monthly content calendar",
        "Keyword-mapped briefs",
        "Written and edited articles",
        "SEO formatting and internal links",
        "Publishing on your site",
        "Monthly performance report",
      ],
      metaTitle: "Blog Writing & Content Marketing Services | Sahab India",
      metaDescription:
        "SEO blog writing and content marketing — keyword briefs, specialist writers, editorial QC, client approval, publishing and performance reporting.",
      metaKeywords: "blog writing services, content marketing agency, seo content writing india",
    },
    {
      slug: "api-integration",
      coverImage: IMG("service-api"),
      title: "API Purchase & Integration",
      category: "technology",
      icon: "Plug",
      order: 11,
      isFeatured: false,
      priceFrom: 25000,
      priceUnit: "project",
      shortDescription:
        "Sourcing, purchasing and integrating third-party APIs — payments, messaging, logistics, verification and more.",
      heroTitle: "Third-party APIs, sourced and wired in properly",
      heroSubtitle:
        "Vendor comparison, cost approval, credentials management, integration, testing and renewal tracking.",
      content:
        "<p>Most products need somebody else's API — payments, KYC, shipping, messaging, maps. Choosing the wrong vendor is expensive, and integrating carelessly is worse.</p><h2>Vendor selection first</h2><p>We compare providers on coverage, pricing, reliability and support, then get your approval on cost before purchase.</p><h2>Credentials handled safely</h2><p>Keys stored securely, environments separated, usage monitored and renewals tracked so nothing expires silently.</p>",
      features: [
        feature("Vendor comparison", "Options compared on coverage, pricing, limits and support."),
        feature("Purchase & approval", "Costs presented for approval before anything is bought."),
        feature("Secure credentials", "Keys stored safely with separate test and live environments."),
        feature("Integration & testing", "Built against the sandbox, then verified in production."),
        feature("Usage monitoring", "Wallet, credit and rate-limit thresholds tracked with alerts."),
        feature("Renewal tracking", "Expiry dates monitored and renewed before they lapse."),
      ],
      processSteps: [
        step("Requirement", "Define exactly what the integration must do."),
        step("API / vendor selection", "Shortlist and compare providers."),
        step("Cost & purchase approval", "Pricing presented and approved before purchase."),
        step("Credentials", "Accounts created and keys stored securely."),
        step("Integration", "Built and documented against the sandbox."),
        step("Testing & production", "Verified end to end, then promoted to live."),
        step("Renewal", "Usage monitored and subscriptions renewed on time."),
      ],
      deliverables: [
        "Vendor comparison and recommendation",
        "Purchase and account setup",
        "Working integration",
        "Test and production verification",
        "Integration documentation",
        "Renewal and usage monitoring",
      ],
      metaTitle: "API Integration Services | Payment, SMS & Third-Party APIs",
      metaDescription:
        "Third-party API sourcing and integration — vendor comparison, purchase, secure credentials, integration, testing, monitoring and renewal tracking.",
      metaKeywords: "api integration services, payment gateway integration, third party api development",
    },
    {
      slug: "whatsapp-business-api",
      coverImage: IMG("service-whatsapp"),
      title: "WhatsApp Business API",
      category: "brand-communication",
      icon: "MessageCircle",
      order: 12,
      isFeatured: false,
      priceFrom: 12000,
      priceUnit: "month",
      shortDescription:
        "Official Meta WhatsApp API — template approval, campaign sends, automated notifications and delivery reporting.",
      heroTitle: "Reach customers where they actually reply",
      heroSubtitle:
        "Verified business account, approved templates, campaign sends and delivery, read and failure reporting.",
      content:
        "<p>WhatsApp gets opened. Used properly — order updates, appointment reminders, renewal alerts, campaign offers — it outperforms email by a wide margin.</p><h2>Set up officially</h2><p>Business verification, official API access, template submission and approval handled for you, so your number never gets flagged.</p><h2>Measured like any other channel</h2><p>Delivery, read and failure rates per campaign, plus wallet and usage tracking so costs never surprise you.</p>",
      features: [
        feature("Business verification", "Meta Business verification and official API onboarding."),
        feature("Template management", "Message templates written and submitted for approval."),
        feature("Campaign sends", "Segmented broadcast campaigns to opted-in contact lists."),
        feature("Automated notifications", "Order, payment, appointment and renewal alerts triggered by your systems."),
        feature("Wallet & usage tracking", "Credit thresholds monitored with low-balance alerts."),
        feature("Delivery reporting", "Sent, delivered, read and failed, per campaign."),
      ],
      processSteps: [
        step("Template creation", "Message templates written for each use case."),
        step("Approval", "Templates submitted to Meta and revised until approved."),
        step("Campaign list", "Opted-in contact lists prepared and segmented."),
        step("Wallet & usage setup", "Credits loaded and thresholds configured."),
        step("Campaign send", "Scheduled or triggered sends."),
        step("Delivery tracking", "Delivery, read and failure status captured."),
        step("Reporting", "Campaign performance and usage reported."),
      ],
      deliverables: [
        "Verified WhatsApp Business account",
        "Approved message templates",
        "Campaign and automation setup",
        "Contact list management",
        "Delivery and read reporting",
        "Wallet and usage monitoring",
      ],
      metaTitle: "WhatsApp Business API Services & Bulk Campaigns | Sahab India",
      metaDescription:
        "Official Meta WhatsApp Business API — verification, template approval, bulk campaigns, automated notifications and delivery reporting.",
      metaKeywords: "whatsapp business api provider, bulk whatsapp marketing, whatsapp api integration",
    },
    {
      slug: "bulk-sms-services",
      coverImage: IMG("service-sms"),
      title: "Bulk SMS Services",
      category: "brand-communication",
      icon: "Send",
      order: 13,
      isFeatured: false,
      priceFrom: 5000,
      priceUnit: "month",
      shortDescription:
        "Sender ID and template registration, transactional and promotional campaigns, with delivery reporting.",
      heroTitle: "SMS that lands, even where data does not",
      heroSubtitle:
        "DLT registration, sender ID setup, template approval, campaign sends and delivery-failure tracking.",
      content:
        "<p>SMS remains the most reliable channel for OTPs, alerts and reminders — and it still works in places where app notifications do not.</p><h2>Compliance handled</h2><p>DLT registration, sender ID and template approval managed for you, so campaigns are not blocked at the gateway.</p>",
      features: [
        feature("Sender ID & DLT", "Registration and approval of your sender ID and templates."),
        feature("Transactional SMS", "OTPs, order updates and alerts triggered from your systems."),
        feature("Promotional campaigns", "Segmented bulk campaigns to opted-in lists."),
        feature("Contact list management", "Uploads, segmentation and opt-out handling."),
        feature("Delivery tracking", "Delivered, failed and pending status per campaign."),
        feature("Usage & billing reports", "Credits consumed and cost per campaign."),
      ],
      processSteps: [
        step("Sender & template setup", "Sender ID and templates registered and approved."),
        step("Contact list", "Lists uploaded, cleaned and segmented."),
        step("Campaign", "Campaign built and scheduled."),
        step("Send", "Delivery through the gateway."),
        step("Delivery tracking", "Delivered and failed status captured."),
        step("Usage & billing", "Consumption and cost reported."),
      ],
      deliverables: [
        "Registered sender ID and templates",
        "Campaign setup and scheduling",
        "Contact list management",
        "Transactional SMS integration",
        "Delivery reports",
        "Usage and billing summary",
      ],
      metaTitle: "Bulk SMS Services & Transactional SMS API | Sahab India",
      metaDescription:
        "Bulk SMS and transactional SMS services — DLT and sender ID registration, template approval, campaign management and delivery reporting.",
      metaKeywords: "bulk sms services, transactional sms api, sms marketing company india",
    },
    {
      slug: "ivr-solutions",
      coverImage: IMG("service-ivr"),
      title: "IVR Solutions",
      category: "brand-communication",
      icon: "PhoneCall",
      order: 14,
      isFeatured: false,
      priceFrom: 15000,
      priceUnit: "month",
      shortDescription:
        "Call-flow design, professional prompts, virtual numbers and call logs — so no enquiry rings out unanswered.",
      heroTitle: "Every call answered, routed and logged",
      heroSubtitle:
        "Call-flow design, recorded prompts, provider setup, integration and reporting on every call that comes in.",
      content:
        "<p>Missed calls are missed revenue. An IVR gives every caller a route, every department a queue and your management a log of what actually happened.</p><h2>Designed around your team</h2><p>We map the call flow to how your departments really work, record professional prompts, and set up routing, voicemail and after-hours handling.</p>",
      features: [
        feature("Call-flow design", "Menus, routing rules, queues and after-hours handling mapped out."),
        feature("Professional prompts", "Recorded greetings and menu prompts in your brand voice."),
        feature("Virtual numbers", "Toll-free or virtual numbers provisioned through the provider."),
        feature("CRM integration", "Calls logged against leads and customers where supported."),
        feature("Call logs & recording", "Full call history with recordings for quality review."),
        feature("Reporting", "Volume, answer rate, missed calls and duration."),
      ],
      processSteps: [
        step("Call-flow design", "Map menus, departments, queues and fallbacks."),
        step("Prompts", "Script and record the greetings and menu prompts."),
        step("Number & provider setup", "Provision numbers and configure the provider."),
        step("Integration", "Connect to your CRM or portal where required."),
        step("Testing", "End-to-end call testing across every path."),
        step("Go live", "Cut over with monitoring in place."),
        step("Reporting & renewal", "Call logs, reports and subscription renewal."),
      ],
      deliverables: [
        "Documented call flow",
        "Recorded IVR prompts",
        "Virtual/toll-free number setup",
        "CRM integration where applicable",
        "Call logs and recordings",
        "Monthly call reports",
      ],
      metaTitle: "IVR Solutions & Toll-Free Number Services | Sahab India",
      metaDescription:
        "IVR call-flow design, professional prompts, virtual and toll-free numbers, CRM integration, call logs and reporting.",
      metaKeywords: "ivr solutions, toll free number provider, ivr service provider india",
    },
  ];

  for (const s of services) {
    const { category, ...rest } = s;
    const data = { ...rest, categoryId: categoryIds[category], status: "PUBLISHED" as const };
    await prisma.service.upsert({ where: { slug: s.slug }, update: data, create: data });
  }
  console.log(`services seeded: ${services.length}`);

  // ---------------------------------------------------------------- navigation
  // Children first - the MenuTree self-relation blocks deleting a parent that
  // still has children.
  await prisma.menuItem.deleteMany({ where: { parentId: { not: null } } });
  await prisma.menuItem.deleteMany({});

  const header = [
    { label: "Home", url: "/", order: 1 },
    { label: "About", url: "/about", order: 2 },
    { label: "Services", url: "/services", order: 3 },
    { label: "Portfolio", url: "/portfolio", order: 4 },
    { label: "Blog", url: "/blog", order: 5 },
    { label: "Contact", url: "/contact", order: 6 },
  ];

  const created: Record<string, string> = {};
  for (const item of header) {
    const row = await prisma.menuItem.create({ data: { ...item, location: "HEADER" } });
    created[item.label] = row.id;
  }

  const dropdown = [
    "web-development",
    "app-development",
    "web-portals-custom-software",
    "seo-services",
    "social-media-marketing",
    "meta-ads",
    "google-ads",
  ];
  for (const [i, slug] of dropdown.entries()) {
    const service = services.find((s) => s.slug === slug)!;
    await prisma.menuItem.create({
      data: {
        label: service.title,
        url: `/services/${slug}`,
        location: "HEADER",
        parentId: created.Services,
        order: i + 1,
      },
    });
  }

  const footerServices = [
    "web-development",
    "app-development",
    "seo-services",
    "social-media-marketing",
    "meta-ads",
    "google-ads",
  ];
  for (const [i, slug] of footerServices.entries()) {
    const service = services.find((s) => s.slug === slug)!;
    await prisma.menuItem.create({
      data: { label: service.title, url: `/services/${slug}`, location: "FOOTER_SERVICES", order: i + 1 },
    });
  }

  for (const [i, item] of [
    { label: "About us", url: "/about" },
    { label: "Our work", url: "/portfolio" },
    { label: "Insights", url: "/blog" },
    { label: "Contact", url: "/contact" },
  ].entries()) {
    await prisma.menuItem.create({ data: { ...item, location: "FOOTER_COMPANY", order: i + 1 } });
  }

  for (const [i, item] of [
    { label: "Privacy Policy", url: "/privacy-policy" },
    { label: "Terms & Conditions", url: "/terms-and-conditions" },
  ].entries()) {
    await prisma.menuItem.create({ data: { ...item, location: "LEGAL", order: i + 1 } });
  }

  // ---------------------------------------------------------------- home page blocks
  await prisma.heroSlide.deleteMany({});
  await prisma.heroSlide.createMany({
    data: [
      {
        eyebrow: "IT & Digital Marketing Agency",
        title: "We build the website, then fill it with customers",
        subtitle:
          "Websites, portals and apps designed to convert — backed by SEO, social and paid campaigns run by the same accountable team.",
        image: IMG("hero-build"),
        ctaLabel: "Book a free consultation",
        ctaUrl: "/contact",
        altLabel: "See our services",
        altUrl: "/services",
        order: 1,
      },
      {
        eyebrow: "Search & Social",
        title: "Marketing measured in leads, not impressions",
        subtitle:
          "SEO retainers, social calendars and ad campaigns with a written plan, a named owner and a monthly report you can hold us to.",
        image: IMG("hero-strategy"),
        ctaLabel: "Get a marketing plan",
        ctaUrl: "/contact",
        altLabel: "Explore marketing",
        altUrl: "/services",
        order: 2,
      },
      {
        eyebrow: "Custom Software",
        title: "Replace the spreadsheets your team has outgrown",
        subtitle:
          "CRMs, portals and internal tools scoped properly, delivered in milestones and handed over with documentation.",
        image: IMG("hero-collaborate"),
        ctaLabel: "Discuss your project",
        ctaUrl: "/contact",
        altLabel: "View case studies",
        altUrl: "/portfolio",
        order: 3,
      },
    ],
  });

  await prisma.stat.deleteMany({});
  await prisma.stat.createMany({
    data: [
      { value: "250", suffix: "+", label: "Projects delivered", icon: "Rocket", order: 1 },
      { value: "120", suffix: "+", label: "Happy clients", icon: "Users", order: 2 },
      { value: "7", suffix: "yrs", label: "In business", icon: "Award", order: 3 },
      { value: "40", suffix: "+", label: "Active retainers", icon: "TrendingUp", order: 4 },
      { value: "14", suffix: "", label: "Services in-house", icon: "Sparkles", order: 5 },
      { value: "98", suffix: "%", label: "Client retention", icon: "Handshake", order: 6 },
    ],
  });

  await prisma.processStep.deleteMany({});
  await prisma.processStep.createMany({
    data: [
      {
        title: "Discovery & scope",
        description: "We map the objective, the audience and the constraints, then put inclusions and exclusions in writing.",
        icon: "Compass",
        order: 1,
      },
      {
        title: "Proposal & approval",
        description: "A fixed quotation with milestones, owners and dates — approved before any work begins.",
        icon: "FileCheck",
        order: 2,
      },
      {
        title: "Build & campaign",
        description: "Sprint-based delivery on a staging URL, or campaigns launched after your creative sign-off.",
        icon: "Wrench",
        order: 3,
      },
      {
        title: "Report & improve",
        description: "A monthly report on what shipped, what it produced and what changes next cycle.",
        icon: "BarChart3",
        order: 4,
      },
    ],
  });

  await prisma.testimonial.deleteMany({});
  await prisma.testimonial.createMany({
    data: [
      {
        quote:
          "They rebuilt our website and took over SEO in the same quarter. Enquiries roughly tripled inside six months, and for the first time we can actually see where they come from.",
        authorName: "Rohit Malhotra",
        authorRole: "Director",
        company: "Malhotra Interiors",
        rating: 5,
        isFeatured: true,
        order: 1,
      },
      {
        quote:
          "The portal replaced four spreadsheets and a WhatsApp group. Scope was documented, milestones were hit, and the handover included documentation — which is rarer than it should be.",
        authorName: "Anita Verma",
        authorRole: "Operations Head",
        company: "Sunrise Logistics",
        rating: 5,
        isFeatured: true,
        order: 2,
      },
      {
        quote:
          "Our Meta and Google campaigns finally get reviewed weekly instead of monthly. Cost per lead is down by about 40% and the reporting is honest, including the months that were flat.",
        authorName: "Karan Shah",
        authorRole: "Founder",
        company: "FitCircle",
        rating: 5,
        isFeatured: true,
        order: 3,
      },
      {
        quote:
          "One team for the app, the website and the campaigns means nobody gets to blame anybody else. That alone has saved us months.",
        authorName: "Priya Nair",
        authorRole: "Marketing Manager",
        company: "Aurum Wellness",
        rating: 5,
        isFeatured: true,
        order: 4,
      },
    ],
  });

  await prisma.faq.deleteMany({ where: { serviceId: null } });
  await prisma.faq.createMany({
    data: [
      {
        question: "How quickly can you start?",
        answer:
          "Most projects begin within a week of the quotation being approved. Retainers usually start at the beginning of the following month so the first calendar or plan covers a full cycle.",
        group: "General",
        order: 1,
      },
      {
        question: "Do you work on a fixed price or a retainer?",
        answer:
          "Both. One-off builds — websites, apps, portals, events — are quoted at a fixed price against a written scope. Ongoing work such as SEO, social media and ad management runs on a monthly retainer.",
        group: "General",
        order: 2,
      },
      {
        question: "Who owns the website, code and ad accounts?",
        answer:
          "You do, from day one. Domains, hosting, source code, ad accounts and analytics are created in your name. We work inside your accounts rather than holding them.",
        group: "General",
        order: 3,
      },
      {
        question: "What happens if we want to change the scope mid-project?",
        answer:
          "We raise a change request showing the impact on cost, timeline and scope. Nothing changes until you approve it, and the original scope stays on record.",
        group: "General",
        order: 4,
      },
      {
        question: "How do you report on marketing performance?",
        answer:
          "Every retainer gets a monthly report covering the work completed and the outcomes — rankings and traffic for SEO, reach and engagement for social, spend and cost per lead for ads.",
        group: "General",
        order: 5,
      },
      {
        question: "Do third-party costs come out of your fee?",
        answer:
          "No. Ad spend, hosting, domains, WhatsApp and SMS credits, API subscriptions and similar provider charges are billed separately at cost unless a proposal explicitly includes them.",
        group: "General",
        order: 6,
      },
    ],
  });

  // ---------------------------------------------------------------- team
  await prisma.teamMember.deleteMany({});
  await prisma.teamMember.createMany({
    data: [
      { name: "Aditya Bhardwaj", role: "Founder & Technology Lead", bio: "Sets the technical direction on every build and still reviews the code that ships.", photo: IMG("team-1"), order: 1 },
      { name: "Sneha Kapoor", role: "Head of Digital Marketing", bio: "Runs the SEO, social and paid programmes, and writes the reports clients actually read.", photo: IMG("team-2"), order: 2 },
      { name: "Rahul Mehta", role: "Project Manager", bio: "Owns scope, milestones and delivery dates across every active project.", photo: IMG("team-3"), order: 3 },
      { name: "Neha Sharma", role: "Creative Lead", bio: "Leads design and video, from brand systems to the monthly social calendar.", photo: IMG("team-4"), order: 4 },
    ],
  });

  // ---------------------------------------------------------------- pages
  const pages = [
    {
      slug: "about",
      title: "About Us",
      isSystem: true,
      heroImage: IMG("page-about"),
      heroTitle: "One team for technology and growth",
      heroSubtitle:
        "We started Sahab India because businesses were stitching together a web developer, an SEO freelancer and an ads agency who never spoke to each other.",
      content:
        "<h2>Who we are</h2><p>Sahab India is a full-service IT and digital marketing agency. We design and build websites, web portals and mobile apps, then run the search, social and paid campaigns that bring people to them.</p><p>The work sits under one roof for a reason. When the developer, the SEO lead and the ads manager sit in the same review, problems get solved instead of forwarded.</p><h2>How we work</h2><p>Every engagement starts with a written scope: objectives, inclusions, exclusions, assumptions, deliverables and acceptance criteria. Every project has a named owner, dated milestones and a health status you can see. Every retainer ends the month with a report.</p><h2>What we will not do</h2><p>We will not lock you into hosting you cannot leave, run ads from an account you do not own, or keep a channel alive because it is billable. If something is not working, you will hear it from us first.</p>",
      metaTitle: "About Sahab India | IT & Digital Marketing Agency",
      metaDescription:
        "Sahab India is a full-service IT and digital marketing agency delivering websites, apps, portals, SEO, social media, paid ads, PR and events.",
      metaKeywords: "about sahab india, digital marketing agency noida, it company india",
    },
    {
      slug: "privacy-policy",
      title: "Privacy Policy",
      heroTitle: "Privacy Policy",
      heroSubtitle: "How we collect, use and protect the information you share with us.",
      content:
        "<h2>Information we collect</h2><p>We collect the details you submit through our enquiry and newsletter forms — name, email address, phone number, company name and the message you send. We also collect standard technical data such as your IP address and browser type.</p><h2>How we use it</h2><p>Your information is used to respond to your enquiry, to provide the services you engage us for, and — where you have opted in — to send occasional updates. We do not sell your data.</p><h2>Cookies and analytics</h2><p>We use cookies and analytics tools to understand how visitors use the site so we can improve it. You can disable cookies in your browser settings.</p><h2>Data retention</h2><p>Enquiry records are retained for as long as needed to serve you and to meet our legal obligations, after which they are deleted.</p><h2>Your rights</h2><p>You can ask us for a copy of the personal data we hold about you, ask us to correct it, or ask us to delete it. Write to us using the contact details on this website.</p><h2>Changes to this policy</h2><p>We may update this policy from time to time. The current version is always published on this page.</p>",
      metaTitle: "Privacy Policy",
      metaDescription: "How Sahab India collects, uses, stores and protects your personal information.",
      metaKeywords: "",
      showInSitemap: true,
    },
    {
      slug: "terms-and-conditions",
      title: "Terms & Conditions",
      heroTitle: "Terms & Conditions",
      heroSubtitle: "The terms that apply when you use this website or engage our services.",
      content:
        "<h2>Use of this website</h2><p>The content on this site is provided for general information. We take care to keep it accurate but make no warranty that it is complete or current at all times.</p><h2>Engagements and scope</h2><p>All work is delivered against a written scope and quotation. Deliverables, timelines and exclusions are those set out in the approved quotation. Changes to scope are handled through a change request showing the impact on cost and timeline.</p><h2>Payments</h2><p>Payment terms are stated on each quotation and invoice. Recurring services such as retainers, hosting, domains and subscriptions are billed for the period stated and renew unless cancelled in writing before the renewal date.</p><h2>Third-party costs</h2><p>Charges from third parties — advertising platforms, hosting and domain providers, messaging and API vendors, payment gateways — are separate from our fees unless a proposal explicitly includes them.</p><h2>Intellectual property</h2><p>On full payment, ownership of the deliverables created specifically for you transfers to you. Pre-existing tools, libraries and frameworks remain the property of their respective owners.</p><h2>Limitation of liability</h2><p>Our liability in connection with any engagement is limited to the fees paid for the service in question.</p><h2>Governing law</h2><p>These terms are governed by the laws of India.</p>",
      metaTitle: "Terms & Conditions",
      metaDescription: "The terms and conditions that apply to Sahab India's website and services.",
      metaKeywords: "",
      showInSitemap: true,
    },
  ];

  for (const page of pages) {
    await prisma.page.upsert({
      where: { slug: page.slug },
      update: page,
      create: page,
    });
  }

  // ---------------------------------------------------------------- blog
  const postCategories = [
    { slug: "seo", name: "SEO", description: "Search strategy, technical fixes and content that ranks.", order: 1 },
    { slug: "paid-ads", name: "Paid Ads", description: "Meta and Google campaigns, budgets and measurement.", order: 2 },
    { slug: "web-development", name: "Web Development", description: "Building sites and software that hold up.", order: 3 },
    { slug: "social-media", name: "Social Media", description: "Content, calendars and community.", order: 4 },
  ];

  const postCategoryIds: Record<string, string> = {};
  for (const c of postCategories) {
    const row = await prisma.postCategory.upsert({ where: { slug: c.slug }, update: c, create: c });
    postCategoryIds[c.slug] = row.id;
  }

  const posts = [
    {
      slug: "how-much-should-a-business-website-cost-in-india",
      coverImage: IMG("post-website-cost"),
      title: "How much should a business website actually cost in India?",
      category: "web-development",
      excerpt:
        "Quotes for the same brief range from ₹8,000 to ₹8 lakh. Here is what actually drives the number, and where cheap gets expensive.",
      content:
        "<p>Ask five agencies to quote for the same website and you will get five numbers that look unrelated. That is not because four of them are lying — it is because 'a website' describes anything from a five-page template to a custom platform.</p><h2>What actually drives the price</h2><p>Three things move the number more than anything else: how much of the design is custom, how many templates the site needs, and how much functionality sits behind it. A brochure site with six pages and a contact form is a fundamentally different build from an e-commerce store with inventory, payments and shipping logic.</p><h3>Design</h3><p>A template applied to your logo is cheap and looks it. Custom design — wireframes, a visual system, states for every component — costs more and is usually the difference between a site people trust and one they bounce from.</p><h3>Templates, not pages</h3><p>Twenty pages that share one layout cost far less than five pages with five distinct layouts. When you compare quotes, compare template counts.</p><h3>Functionality</h3><p>Forms, logins, dashboards, payments, multi-language and integrations each add build and testing time. Be specific about what you need at quotation stage — this is where scope creep usually starts.</p><h2>Where cheap gets expensive</h2><p>The ₹8,000 website is generally a page builder on shared hosting with no structured data, no performance budget and no admin training. It ranks poorly, loads slowly on mobile and needs replacing within eighteen months. You pay twice.</p><h2>A sensible way to budget</h2><p>Decide what the site must achieve in its first year — enquiries, orders, applications — and work backwards. If the site needs to produce twenty qualified enquiries a month, that is worth a real investment. If it exists so people can check you are real, a smaller build is honest.</p><h2>Questions to ask any quotation</h2><ul><li>How many unique page templates are included?</li><li>Who owns the domain, hosting and source code?</li><li>Is the content management system included, and will you train our team?</li><li>What is covered after launch, and for how long?</li><li>Are hosting and domain renewals inside the price or billed separately?</li></ul><p>A good quotation answers all five without being asked.</p>",
      metaTitle: "How Much Should a Business Website Cost in India? (2026 Guide)",
      metaDescription:
        "Website quotes range from ₹8,000 to ₹8 lakh for the same brief. Here is what actually drives the cost and the five questions every quotation should answer.",
      metaKeywords: "website cost india, website development price, how much does a website cost",
      tags: ["Web Development", "Budgeting"],
      days: 6,
    },
    {
      slug: "technical-seo-checklist-that-actually-moves-rankings",
      coverImage: IMG("post-technical-seo"),
      title: "The technical SEO checklist that actually moves rankings",
      category: "seo",
      excerpt:
        "Most technical SEO audits list two hundred issues and fix nothing. These are the items that reliably change what Google does with your site.",
      content:
        "<p>Technical SEO audits have a habit of producing a 200-row spreadsheet that nobody ever works through. In practice, a small number of issues account for most of the difference between a site that ranks and one that does not.</p><h2>1. Make sure the pages can be crawled and indexed</h2><p>Start in Search Console. If important pages are excluded, blocked by robots.txt, or carrying a stray noindex from a staging build, nothing else you do matters. This is the single most common cause of a site that 'suddenly stopped ranking'.</p><h2>2. Fix Core Web Vitals honestly</h2><p>Largest Contentful Paint is usually a hero image that is too large or loaded too late. Cumulative Layout Shift is usually images and ads without reserved space. Both are fixable in a day by a competent developer, and both are measured on real users, not lab tests.</p><h2>3. One page per intent</h2><p>Two pages targeting the same query compete with each other and split their signals. Consolidate, redirect the weaker one, and keep the internal links pointing to the survivor.</p><h2>4. Internal linking with meaningful anchors</h2><p>Your most valuable pages should be reachable in two or three clicks from the home page, linked with anchor text that describes what they are about. This is the cheapest ranking improvement available to most sites.</p><h2>5. Structured data that matches the page</h2><p>Organisation, Service, Article, FAQ and Breadcrumb markup help search engines understand context and can earn richer results. Mark up what is actually on the page — nothing else.</p><h2>6. Clean, stable URLs</h2><p>Readable, lowercase, hyphenated, without session parameters. When URLs change, redirect the old ones with a 301 and update the internal links rather than relying on the redirect forever.</p><h2>7. XML sitemap and canonical discipline</h2><p>The sitemap should list only canonical, indexable URLs. Every page should declare its own canonical. Inconsistency here confuses crawlers and wastes crawl budget.</p><h2>What to do first</h2><p>Work in that order. Indexing before speed, speed before schema. Fixing crawl issues on ten important pages will beat fixing markup on two hundred unimportant ones.</p>",
      metaTitle: "Technical SEO Checklist That Actually Moves Rankings",
      metaDescription:
        "Skip the 200-row audit. These seven technical SEO fixes — indexing, Core Web Vitals, consolidation, internal links and schema — are the ones that change rankings.",
      metaKeywords: "technical seo checklist, seo audit, core web vitals, indexing issues",
      tags: ["SEO", "Technical SEO"],
      days: 18,
    },
    {
      slug: "meta-ads-vs-google-ads-where-to-spend-first",
      coverImage: IMG("post-meta-vs-google"),
      title: "Meta Ads or Google Ads: where should you spend first?",
      category: "paid-ads",
      excerpt:
        "One captures demand that already exists, the other creates it. Which you start with depends on whether people are already searching for what you sell.",
      content:
        "<p>This is the most common question we get from businesses with a first advertising budget, and the honest answer is that it depends on one thing: whether people are already searching for what you sell.</p><h2>Google captures existing demand</h2><p>If someone types 'emergency plumber in Noida', they have a problem right now and they are comparing options. Google Ads puts you in front of that person at the moment of intent. Conversion rates are higher, the sales cycle is shorter, and measurement is straightforward.</p><p>The catch is that you can only capture demand that exists. If your monthly search volume is a few hundred queries, Google will spend your budget quickly and then run out of road.</p><h2>Meta creates demand</h2><p>Nobody searches for a product category they have never heard of. Meta lets you put a compelling offer in front of a defined audience who were not looking for you — which is how new products and lifestyle categories get built.</p><p>The trade-off is that you are interrupting people. Creative quality matters far more, the funnel is longer, and you need retargeting to convert the interest you generate.</p><h2>A simple rule</h2><p>Check search volume for the three terms a customer would use to describe your service. If there is meaningful volume, start with Google — you are buying customers who have already decided they need what you sell. If there is almost none, start with Meta and build awareness.</p><h2>Budget realistically</h2><p>Splitting a small budget across both platforms usually means neither gets enough data to optimise. Below roughly ₹50,000 a month in ad spend, pick one, learn what works, then expand.</p><h2>Measure the same way on both</h2><p>Whichever you choose, the number that matters is cost per qualified lead, not cost per click or impressions. Set up conversion tracking before the first rupee is spent, and hold both platforms to the same standard.</p>",
      metaTitle: "Meta Ads vs Google Ads: Where Should You Spend First?",
      metaDescription:
        "Google captures existing demand, Meta creates it. A practical framework for deciding where a first advertising budget should go — and how to measure both fairly.",
      metaKeywords: "meta ads vs google ads, facebook ads or google ads, ppc strategy",
      tags: ["Paid Ads", "Strategy"],
      days: 32,
    },
  ];

  for (const p of posts) {
    const publishedAt = new Date();
    publishedAt.setDate(publishedAt.getDate() - p.days);

    const words = p.content.replace(/<[^>]*>/g, " ").split(/\s+/).filter(Boolean).length;
    const data = {
      title: p.title,
      slug: p.slug,
      excerpt: p.excerpt,
      content: p.content,
      coverImage: p.coverImage,
      categoryId: postCategoryIds[p.category],
      authorId: admin.id,
      status: "PUBLISHED" as const,
      publishedAt,
      readingMinutes: Math.max(1, Math.round(words / 220)),
      metaTitle: p.metaTitle,
      metaDescription: p.metaDescription,
      metaKeywords: p.metaKeywords,
    };

    const post = await prisma.post.upsert({ where: { slug: p.slug }, update: data, create: data });

    await prisma.postTag.deleteMany({ where: { postId: post.id } });
    for (const name of p.tags) {
      const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-");
      const tag = await prisma.tag.upsert({ where: { slug }, create: { name, slug }, update: { name } });
      await prisma.postTag.create({ data: { postId: post.id, tagId: tag.id } });
    }
  }
  console.log(`posts seeded: ${posts.length}`);

  // ---------------------------------------------------------------- portfolio
  const projects = [
    {
      slug: "sunrise-logistics-operations-portal",
      coverImage: IMG("case-logistics-portal"),
      title: "An operations portal that replaced four spreadsheets",
      clientName: "Sunrise Logistics",
      industry: "Logistics",
      summary:
        "A custom web portal covering consignments, drivers, clients and billing — built to replace a spreadsheet-and-WhatsApp process.",
      challenge:
        "Sunrise was running 60+ daily consignments across four spreadsheets and three WhatsApp groups. Nobody could answer 'where is this shipment' without three phone calls, and invoices were routinely raised late because nobody knew what had been delivered.",
      solution:
        "<p>We ran requirement workshops with dispatch, drivers and accounts, then wrote a functional scope covering five modules: consignments, fleet, clients, billing and reporting.</p><p>The portal was delivered in four milestones over eleven weeks, each demoed on staging. Role-based access means drivers see only their runs, accounts sees only billing, and management sees everything.</p><p>Delivery status updates trigger automatic client notifications, and invoices are generated from delivered consignments rather than from memory.</p>",
      results: [
        { value: "4 → 1", label: "Systems replaced" },
        { value: "-70%", label: "Time to raise invoices" },
        { value: "100%", label: "Consignments tracked" },
      ],
      technologies: ["Next.js", "Node.js", "MySQL", "Role-based access", "WhatsApp API"],
      gallery: [IMG("case-logistics-portal-2"), IMG("service-web-portals")],
      isFeatured: true,
      order: 1,
      services: ["web-portals-custom-software", "whatsapp-business-api"],
      metaTitle: "Case Study: Logistics Operations Portal | Sahab India",
      metaDescription:
        "How a custom operations portal replaced four spreadsheets for a logistics company, cutting invoicing time by 70% and tracking every consignment.",
      metaKeywords: "logistics portal case study, custom software case study",
    },
    {
      slug: "malhotra-interiors-website-seo",
      coverImage: IMG("case-interiors"),
      title: "A rebuilt website and SEO programme that tripled enquiries",
      clientName: "Malhotra Interiors",
      industry: "Interior Design",
      summary:
        "A new website plus a six-month SEO retainer that moved the business from page four to the local map pack.",
      challenge:
        "The existing site was slow, unindexed on most pages and produced roughly four enquiries a month — all of which came from referrals rather than search.",
      solution:
        "<p>We rebuilt the site on a modern stack with a project gallery, service pages for each offering and location pages for the three cities served.</p><p>Alongside the build, a six-month SEO retainer addressed the technical foundation, mapped keywords to pages, published twelve articles and cleaned up the Google Business Profile and citations.</p><p>Conversion tracking was configured from day one, so every enquiry is attributed to a channel.</p>",
      results: [
        { value: "+212%", label: "Organic traffic" },
        { value: "4 → 13", label: "Monthly enquiries" },
        { value: "Top 3", label: "Local map pack" },
      ],
      technologies: ["Next.js", "Local SEO", "Content", "GA4"],
      gallery: [IMG("case-interiors-2"), IMG("service-seo")],
      isFeatured: true,
      order: 2,
      services: ["web-development", "seo-services", "blog-content-writing"],
      metaTitle: "Case Study: Website & SEO for an Interior Design Firm",
      metaDescription:
        "A rebuilt website and six-month SEO retainer took an interior design firm from four enquiries a month to thirteen, and into the local map pack.",
      metaKeywords: "seo case study, website redesign case study, local seo results",
    },
    {
      slug: "fitcircle-paid-media-turnaround",
      coverImage: IMG("case-paid-media"),
      title: "Cutting cost per lead by 40% across Meta and Google",
      clientName: "FitCircle",
      industry: "Health & Fitness",
      summary:
        "A paid media account restructure and creative overhaul that halved wasted spend inside two months.",
      challenge:
        "FitCircle was spending across Meta and Google with a single campaign per platform, no negative keywords, no conversion tracking beyond page views, and creative that had not changed in eight months.",
      solution:
        "<p>We rebuilt both accounts around funnel stages, implemented proper conversion tracking through GA4 and the Conversions API, and produced a fresh creative set with three variants per audience.</p><p>Weekly optimisation covers search-term review, negative keywords, budget pacing and creative rotation. Reporting moved from platform screenshots to a single sheet showing spend, leads, CPL and trial conversions.</p>",
      results: [
        { value: "-40%", label: "Cost per lead" },
        { value: "+68%", label: "Qualified leads" },
        { value: "2.4x", label: "Return on ad spend" },
      ],
      technologies: ["Meta Ads", "Google Ads", "GA4", "Conversions API"],
      gallery: [IMG("case-paid-media-2"), IMG("service-google-ads")],
      isFeatured: true,
      order: 3,
      services: ["meta-ads", "google-ads"],
      metaTitle: "Case Study: 40% Lower Cost Per Lead on Meta & Google Ads",
      metaDescription:
        "How restructuring Meta and Google Ads accounts, fixing conversion tracking and refreshing creative cut cost per lead by 40% for a fitness brand.",
      metaKeywords: "google ads case study, meta ads case study, reduce cost per lead",
    },
  ];

  for (const p of projects) {
    const { services: serviceSlugs, ...rest } = p;
    const completedAt = new Date();
    completedAt.setMonth(completedAt.getMonth() - 3);

    const data = { ...rest, completedAt, status: "PUBLISHED" as const, websiteUrl: "" };
    const project = await prisma.project.upsert({ where: { slug: p.slug }, update: data, create: data });

    await prisma.projectService.deleteMany({ where: { projectId: project.id } });
    for (const slug of serviceSlugs) {
      const service = await prisma.service.findUnique({ where: { slug } });
      if (service) await prisma.projectService.create({ data: { projectId: project.id, serviceId: service.id } });
    }
  }
  console.log(`projects seeded: ${projects.length}`);

  // ---------------------------------------------------------------- message templates
  const templates = [
    {
      key: "renewal_reminder",
      name: "Renewal reminder",
      channel: "EMAIL" as const,
      subject: "{{name}} renewal — {{days}} day(s) to go",
      body:
        "<p>Dear {{client}},</p><p>Your <strong>{{name}}</strong> with {{provider}} is due for renewal on <strong>{{expiry}}</strong>.</p><p>Renewal amount: ₹{{amount}}.</p><p>Please confirm so we can keep the service running without interruption.</p>",
      variables: ["client", "name", "provider", "days", "amount", "expiry"],
    },
    {
      key: "invoice_reminder",
      name: "Payment reminder",
      channel: "EMAIL" as const,
      subject: "Payment reminder — {{number}}",
      body:
        "<p>Dear {{client}},</p><p>Invoice <strong>{{number}}</strong> for {{title}} has an outstanding balance of ₹{{balance}}{{dueDate}}.</p><p>We would appreciate settlement at your earliest convenience.</p>",
      variables: ["client", "number", "title", "balance", "dueDate"],
    },
    {
      key: "approval_request",
      name: "Approval request",
      channel: "EMAIL" as const,
      subject: "Your approval is needed — {{title}}",
      body:
        "<p>Dear {{client}},</p><p>{{title}} is ready for your review in the client portal.</p><p>Please sign in to approve or request changes.</p>",
      variables: ["client", "title"],
    },
    {
      key: "renewal_whatsapp",
      name: "Renewal reminder (WhatsApp)",
      channel: "WHATSAPP" as const,
      subject: "",
      body: "Hi {{client}}, your {{name}} renews on {{expiry}}. Amount: Rs {{amount}}. Reply CONFIRM to proceed.",
      variables: ["client", "name", "expiry", "amount"],
    },
    {
      key: "invoice_sms",
      name: "Payment reminder (SMS)",
      channel: "SMS" as const,
      subject: "",
      body: "Invoice {{number}}: Rs {{balance}} outstanding. Kindly settle at your earliest. - {{agency}}",
      variables: ["number", "balance", "agency"],
    },
  ];

  for (const template of templates) {
    await prisma.messageTemplate.upsert({
      where: { key: template.key },
      update: { name: template.name, channel: template.channel, subject: template.subject, body: template.body, variables: template.variables },
      create: template,
    });
  }
  console.log(`message templates seeded: ${templates.length}`);

  console.log("\nSeed complete.");
  console.log(`Admin login → ${email} / ${password}`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
