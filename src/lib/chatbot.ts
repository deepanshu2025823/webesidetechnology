import "server-only";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/queries";

/**
 * "Sahab", the scripted assistant.
 *
 * Every answer is composed from the site's own data — the live service
 * catalogue, real prices, the settings record — rather than from a fixed
 * script, so the bot cannot drift out of date when the website changes. It
 * makes no claims it cannot support: anything outside the intents below is
 * routed to a human instead of guessed at.
 */

export type Suggestion = { label: string; intent: string };

export type BotReply = {
  body: string;
  suggestions: Suggestion[];
  /** True when the visitor should be put in the queue for a person. */
  handoff?: boolean;
};

export const GREETING_SUGGESTIONS: Suggestion[] = [
  { label: "What do you do?", intent: "services" },
  { label: "Pricing", intent: "pricing" },
  { label: "See your work", intent: "portfolio" },
  { label: "Talk to a human", intent: "human" },
];

/** Words that route a free-text message to an intent. */
const INTENTS: { intent: string; keywords: string[] }[] = [
  { intent: "human", keywords: ["human", "agent", "person", "someone", "real", "talk to", "call me", "executive", "baat"] },
  { intent: "pricing", keywords: ["price", "pricing", "cost", "charge", "quote", "quotation", "budget", "rate", "kitna", "paisa"] },
  { intent: "services", keywords: ["service", "what do you do", "offer", "help with", "website", "app", "seo", "social", "marketing", "ads"] },
  { intent: "portfolio", keywords: ["portfolio", "work", "case study", "example", "client", "project"] },
  { intent: "contact", keywords: ["contact", "phone", "number", "email", "address", "office", "where", "location", "timing", "hours"] },
  { intent: "timeline", keywords: ["how long", "timeline", "duration", "deliver", "kitne din", "time lagega"] },
  { intent: "greeting", keywords: ["hi", "hello", "hey", "namaste", "good morning", "good evening"] },
];

export function detectIntent(message: string): string {
  const text = message.toLowerCase();
  for (const { intent, keywords } of INTENTS) {
    if (keywords.some((keyword) => text.includes(keyword))) return intent;
  }
  return "unknown";
}

const money = (amount: number) => `₹${amount.toLocaleString("en-IN")}`;

/** The reply for one intent, built from live site data. */
export async function replyTo(intent: string): Promise<BotReply> {
  const settings = await getSettings();

  const backToMenu: Suggestion[] = [
    { label: "Something else", intent: "menu" },
    { label: "Talk to a human", intent: "human" },
  ];

  switch (intent) {
    case "greeting":
    case "menu":
      return {
        body: `Hello! I'm Sahab, the assistant at ${settings.siteName}. What can I help you with?`,
        suggestions: GREETING_SUGGESTIONS,
      };

    case "services": {
      const services = await prisma.service.findMany({
        where: { status: "PUBLISHED" },
        select: { title: true, shortDescription: true },
        orderBy: { order: "asc" },
        take: 8,
      });

      if (!services.length) {
        return {
          body: "We build websites and apps, and run SEO, social media and paid campaigns. Shall I put you through to the team for the detail?",
          suggestions: backToMenu,
        };
      }

      return {
        body: `Here's what we do:\n\n${services
          .map((s) => `• ${s.title}${s.shortDescription ? ` — ${s.shortDescription}` : ""}`)
          .join("\n")}\n\nWant pricing on any of these?`,
        suggestions: [{ label: "Yes, pricing", intent: "pricing" }, ...backToMenu],
      };
    }

    case "pricing": {
      const priced = await prisma.service.findMany({
        where: { status: "PUBLISHED", priceFrom: { not: null } },
        select: { title: true, priceFrom: true, priceUnit: true },
        orderBy: { order: "asc" },
        take: 8,
      });

      const lines = priced
        .map((s) => `• ${s.title} — from ${money(s.priceFrom as number)} per ${s.priceUnit || "project"}`)
        .join("\n");

      return {
        body: `${
          lines
            ? `Indicative starting prices:\n\n${lines}\n\n`
            : ""
        }Final cost depends on scope. You can build an estimate yourself with our cost calculator, or I can get someone to send you a proper quote.`,
        suggestions: [
          { label: "Open the calculator", intent: "calculator" },
          { label: "Send me a quote", intent: "human" },
          { label: "Something else", intent: "menu" },
        ],
      };
    }

    case "calculator":
      return {
        body: "Our project cost calculator is at /cost-calculator — pick what you need and it works out a range instantly. Prefer a person to walk you through it?",
        suggestions: backToMenu,
      };

    case "portfolio": {
      const projects = await prisma.project.findMany({
        where: { status: "PUBLISHED" },
        select: { title: true, clientName: true, slug: true },
        orderBy: { createdAt: "desc" },
        take: 5,
      });

      if (!projects.length) {
        return {
          body: "Our portfolio page has recent work across web, apps and campaigns. Want someone to send case studies for your industry?",
          suggestions: backToMenu,
        };
      }

      return {
        body: `Some recent work:\n\n${projects
          .map((p) => `• ${p.title}${p.clientName ? ` — ${p.clientName}` : ""}`)
          .join("\n")}\n\nThe full portfolio is on our website. Want case studies for your industry?`,
        suggestions: backToMenu,
      };
    }

    case "contact": {
      const rows = [
        settings.phone ? `Phone: ${settings.phone}` : "",
        settings.email ? `Email: ${settings.email}` : "",
        [settings.addressLine, settings.city, settings.state].filter(Boolean).join(", "),
        settings.workingHours ? `Hours: ${settings.workingHours}` : "",
      ].filter(Boolean);

      return {
        body: `Here's how to reach us:\n\n${rows.join("\n")}`,
        suggestions: backToMenu,
      };
    }

    case "timeline":
      return {
        body: "It depends on scope — a brochure site is usually 2–4 weeks, a larger build or portal 6–12 weeks, and retainers run month to month. For a date against your actual requirement, the team can confirm properly.",
        suggestions: backToMenu,
      };

    case "human":
      return {
        body: "Of course — let me get someone from the team. Could you leave your name and a phone number or email so they can reach you?",
        suggestions: [],
        handoff: true,
      };

    default:
      return {
        body: "I'm not sure I follow — I can help with services, pricing, our work and contact details. For anything else, a person from the team is better placed than I am.",
        suggestions: GREETING_SUGGESTIONS,
      };
  }
}
