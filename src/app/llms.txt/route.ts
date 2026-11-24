import { getPosts, getProjects, getServices, getSettings } from "@/lib/queries";
import { absoluteUrl } from "@/lib/utils";

/**
 * /llms.txt — a plain Markdown map of the site for AI search engines and
 * assistants (llmstxt.org): who the company is, how to reach it, and the pages
 * that answer the questions people ask about it.
 *
 * Built from the same published content as the site, so a service, case study
 * or article added in admin appears here without anyone editing a file.
 */
export const revalidate = 3600;

const line = (text: string | null | undefined) => (text ?? "").replace(/\s+/g, " ").trim();
const link = (title: string, path: string, note?: string | null) =>
  `- [${line(title)}](${absoluteUrl(path)})${line(note) ? `: ${line(note)}` : ""}`;

export async function GET() {
  const [s, services, projects, posts] = await Promise.all([
    getSettings(),
    getServices(),
    getProjects(),
    getPosts({ take: 30 }),
  ]);

  const contact = [
    s.email && `Email: ${s.email}`,
    s.phone && `Phone: ${s.phone}`,
    s.whatsapp && `WhatsApp: ${s.whatsapp}`,
    s.workingHours && `Hours: ${s.workingHours}`,
    [s.city, s.state, s.country].filter(Boolean).join(", ") && `Location: ${[s.city, s.state, s.country].filter(Boolean).join(", ")}`,
  ].filter(Boolean);

  const body = [
    `# ${s.siteName}`,
    "",
    `> ${line(s.description || s.tagline)}`,
    "",
    `${s.siteName} is a digital agency in India: websites, web portals and apps designed and built, backed by SEO, paid ads (Google and Meta), PR, social media and influencer marketing. Ready-to-launch portals include LMS, CRM, HRMS, limousine, travel and locum management.`,
    "",
    ...(contact.length ? ["## Contact", "", ...contact.map((c) => `- ${c}`), link("Contact form", "/contact"), ""] : []),
    "## Key pages",
    "",
    link("Home", "/"),
    link("About", "/about", "Who we are and how we work"),
    link("Services", "/services", "Everything we offer"),
    link("Portfolio", "/portfolio", "Case studies with results"),
    link("Cost calculator", "/cost-calculator", "Estimate a project's price"),
    link("Blog", "/blog", "Guides on websites, SEO and paid media"),
    "",
    ...(services.length ? ["## Services", "", ...services.map((x) => link(x.title, `/services/${x.slug}`, x.shortDescription)), ""] : []),
    ...(projects.length ? ["## Case studies", "", ...projects.map((x) => link(x.title, `/portfolio/${x.slug}`, x.summary)), ""] : []),
    ...(posts.length ? ["## Articles", "", ...posts.map((x) => link(x.title, `/blog/${x.slug}`, x.excerpt)), ""] : []),
    "## Optional",
    "",
    link("Sitemap", "/sitemap.xml", "Every public page"),
    "",
  ].join("\n");

  return new Response(body, {
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "public, max-age=3600" },
  });
}
