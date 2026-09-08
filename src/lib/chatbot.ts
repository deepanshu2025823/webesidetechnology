import "server-only";
import { prisma } from "@/lib/prisma";
import { getSettings } from "@/lib/queries";

/**
 * "Sahab", the site's assistant.
 *
 * Two sources of truth, in this order:
 *
 * 1. **Taught answers** — rows the team writes in Admin → Live chat → Chatbot
 *    training. They can add a question the bot has never heard of, or override
 *    a built-in intent by naming it.
 * 2. **Built-in intents** — services, pricing, portfolio and contact, composed
 *    from the live service catalogue and the settings record rather than from a
 *    fixed script, so those answers cannot drift out of date when the website
 *    changes.
 *
 * Anything that matches neither is routed to a person rather than guessed at.
 */

export type Suggestion = {
  label: string;
  intent: string;
  /** What to send when the chip is tapped. Defaults to the built-in phrasing. */
  text?: string;
};

export type BotReply = {
  body: string;
  suggestions: Suggestion[];
  /** True when the visitor should be put in the queue for a person. */
  handoff?: boolean;
};

const BUILT_IN_SUGGESTIONS: Suggestion[] = [
  { label: "What do you do?", intent: "services" },
  { label: "Pricing", intent: "pricing" },
  { label: "See your work", intent: "portfolio" },
  { label: "Talk to a human", intent: "human" },
];

/** Words that route a free-text message to a built-in intent. */
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

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.map((v) => String(v).trim()).filter(Boolean) : [];

type TaughtAnswer = {
  id: string;
  question: string;
  keywords: unknown;
  reply: string;
  followUps: unknown;
  intent: string;
  handsOff: boolean;
  isQuickReply: boolean;
};

function taught() {
  return prisma.chatAnswer.findMany({
    where: { isActive: true },
    orderBy: { order: "asc" },
    select: {
      id: true,
      question: true,
      keywords: true,
      reply: true,
      followUps: true,
      intent: true,
      handsOff: true,
      isQuickReply: true,
    },
  });
}

/** Chips a taught answer offers afterwards, plus the way back to the menu. */
function taughtSuggestions(answer: TaughtAnswer): Suggestion[] {
  const own = strings(answer.followUps).map((label) => ({
    label,
    // The chip sends its own text back, so the matcher resolves it the same way
    // it would if the visitor had typed the question themselves.
    intent: `taught:${label.toLowerCase()}`,
    text: label,
  }));

  return [...own, { label: "Something else", intent: "menu" }, { label: "Talk to a human", intent: "human" }];
}

/**
 * The best taught answer for a message, or null.
 *
 * The longest matching keyword wins, so a specific phrase ("wordpress
 * maintenance") beats a general one ("wordpress") no matter what order the rows
 * are in.
 */
function bestMatch(message: string, answers: TaughtAnswer[]): TaughtAnswer | null {
  const text = message.toLowerCase().trim();
  if (!text) return null;

  let best: TaughtAnswer | null = null;
  let bestLength = 0;

  for (const answer of answers) {
    const phrases = [...strings(answer.keywords), answer.question].map((k) => k.toLowerCase().trim());
    for (const phrase of phrases) {
      if (phrase.length < 3 || !text.includes(phrase)) continue;
      if (phrase.length > bestLength) {
        best = answer;
        bestLength = phrase.length;
      }
    }
  }

  return best;
}

/** Opening chips: the team's own, when it has written any. */
export async function greetingSuggestions(): Promise<Suggestion[]> {
  const answers = await taught();
  const quick = answers
    .filter((a) => a.isQuickReply)
    .map((a) => ({ label: a.question, intent: `taught:${a.id}`, text: a.question }));

  return quick.length ? [...quick, { label: "Talk to a human", intent: "human" }] : BUILT_IN_SUGGESTIONS;
}

/** The opening line, editable in settings. */
export async function greeting(): Promise<string> {
  const settings = await getSettings();
  return (
    settings.chatGreeting ||
    `Hello! I'm Sahab, the assistant at ${settings.siteName}. Ask me about our services, pricing or recent work — or I can put you through to the team.`
  );
}

/**
 * Answers one visitor message: taught rows first, then the built-in intents.
 */
export async function answer(message: string): Promise<BotReply> {
  const answers = await taught();

  const match = bestMatch(message, answers);
  if (match) {
    // Counts what visitors actually ask about, so the team can see which taught
    // answers earn their place. A failed increment must not cost a reply.
    prisma.chatAnswer
      .update({ where: { id: match.id }, data: { hits: { increment: 1 } } })
      .catch(() => {});

    return {
      body: match.reply,
      suggestions: taughtSuggestions(match),
      handoff: match.handsOff,
    };
  }

  const intent = detectIntent(message);

  // A taught row may claim a built-in intent, replacing that answer wholesale.
  const override = answers.find((a) => a.intent && a.intent === intent);
  if (override) {
    return {
      body: override.reply,
      suggestions: taughtSuggestions(override),
      handoff: override.handsOff,
    };
  }

  return replyTo(intent);
}

/** The reply for one built-in intent, built from live site data. */
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
        suggestions: await greetingSuggestions(),
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
        body:
          settings.chatHandoffPrompt ||
          "Of course — let me get someone from the team. Could you leave your name and a phone number or email so they can reach you?",
        suggestions: [],
        handoff: true,
      };

    default:
      return {
        body:
          settings.chatFallback ||
          "I'm not sure I follow — I can help with services, pricing, our work and contact details. For anything else, a person from the team is better placed than I am.",
        suggestions: await greetingSuggestions(),
      };
  }
}
