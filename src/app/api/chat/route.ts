import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { answer, greeting, greetingSuggestions, type Suggestion } from "@/lib/chatbot";
import { alertChatHandoff } from "@/lib/alerts";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * The visitor half of the chat widget.
 *
 * A conversation is identified by an unguessable token the browser keeps, not
 * by a login — every read and write is scoped by that token, so one visitor can
 * never reach another's thread. GET polls for agent replies; POST sends.
 */

const MAX_BODY = 2000;

type Wire = {
  token: string;
  status: string;
  messages: { id: string; role: string; body: string; at: string }[];
  suggestions?: Suggestion[];
};

const startSchema = z.object({
  action: z.literal("start"),
  token: z.string().max(64).optional(),
  pageUrl: z.string().max(500).optional().default(""),
});

const messageSchema = z.object({
  action: z.literal("message"),
  token: z.string().min(10).max(64),
  body: z.string().trim().min(1).max(MAX_BODY),
});

const handoffSchema = z.object({
  action: z.literal("handoff"),
  token: z.string().min(10).max(64),
  name: z.string().trim().max(160).optional().default(""),
  email: z.string().trim().max(190).optional().default(""),
  phone: z.string().trim().max(60).optional().default(""),
});

const schema = z.discriminatedUnion("action", [startSchema, messageSchema, handoffSchema]);

function serialise(
  session: { token: string; status: string },
  messages: { id: string; role: string; body: string; createdAt: Date }[],
  suggestions?: Suggestion[],
): Wire {
  return {
    token: session.token,
    status: session.status,
    messages: messages.map((m) => ({ id: m.id, role: m.role, body: m.body, at: m.createdAt.toISOString() })),
    ...(suggestions ? { suggestions } : {}),
  };
}

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  // Generous enough for real conversation, tight enough to stop a script.
  const limit = rateLimit(`chat:${ip}`, 30, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "You're sending messages very quickly. Give it a moment." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter ?? 60) } },
    );
  }

  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = schema.safeParse(payload);
  if (!parsed.success) return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  const input = parsed.data;

  // ------------------------------------------------------------------ start
  if (input.action === "start") {
    if (input.token) {
      const existing = await prisma.chatSession.findUnique({
        where: { token: input.token },
        include: { messages: { orderBy: { createdAt: "asc" }, take: 100 } },
      });
      if (existing && !existing.closedAt) {
        return NextResponse.json(
          serialise(existing, existing.messages, existing.status === "BOT" ? await greetingSuggestions() : []),
        );
      }
    }

    const token = randomBytes(24).toString("base64url");

    const session = await prisma.chatSession.create({
      data: {
        token,
        pageUrl: input.pageUrl,
        ipAddress: ip,
        // Greeting and opening chips both come from admin when the team has
        // written their own.
        messages: { create: { role: "BOT", body: await greeting() } },
      },
      include: { messages: true },
    });

    return NextResponse.json(serialise(session, session.messages, await greetingSuggestions()));
  }

  // The remaining actions all operate on an existing, open conversation.
  const session = await prisma.chatSession.findUnique({ where: { token: input.token } });
  if (!session || session.closedAt) {
    return NextResponse.json({ error: "This conversation has ended. Refresh to start a new one." }, { status: 404 });
  }

  // ---------------------------------------------------------------- handoff
  if (input.action === "handoff") {
    await prisma.chatSession.update({
      where: { id: session.id },
      data: {
        visitorName: input.name,
        visitorEmail: input.email.toLowerCase(),
        visitorPhone: input.phone,
        status: "WAITING_AGENT",
        handoffAt: new Date(),
        lastMessageAt: new Date(),
        unreadForAgent: { increment: 1 },
        messages: {
          create: {
            role: "BOT",
            body: "Thanks — I've passed this to the team. Someone will reply here shortly. You can keep typing in the meantime.",
          },
        },
      },
    });

    // Also capture it as a lead so it lands in the pipeline, not just the inbox.
    if (input.email || input.phone) {
      const lead = await prisma.enquiry.create({
        data: {
          name: input.name || "Live chat visitor",
          email: input.email.toLowerCase(),
          phone: input.phone,
          message: "Started a live chat and asked to speak to a person.",
          source: "chatbot",
          pageUrl: session.pageUrl,
          ipAddress: ip,
        },
      });
      await prisma.chatSession.update({ where: { id: session.id }, data: { leadId: lead.id } });
    }

    await alertChatHandoff(session.id);

    const messages = await prisma.chatMessage.findMany({
      where: { sessionId: session.id },
      orderBy: { createdAt: "asc" },
      take: 100,
    });
    return NextResponse.json(serialise({ ...session, status: "WAITING_AGENT" }, messages));
  }

  // ---------------------------------------------------------------- message
  await prisma.chatMessage.create({ data: { sessionId: session.id, role: "VISITOR", body: input.body } });
  await prisma.chatSession.update({
    where: { id: session.id },
    data: { lastMessageAt: new Date(), unreadForAgent: { increment: 1 } },
  });

  let suggestions: Suggestion[] = [];
  let handoff = false;

  // Once a person is involved the bot stays quiet — two voices in one thread
  // is worse than a short wait.
  if (session.status === "BOT") {
    const reply = await answer(input.body);
    suggestions = reply.suggestions;
    handoff = Boolean(reply.handoff);

    await prisma.chatMessage.create({ data: { sessionId: session.id, role: "BOT", body: reply.body } });
  }

  const messages = await prisma.chatMessage.findMany({
    where: { sessionId: session.id },
    orderBy: { createdAt: "asc" },
    take: 100,
  });

  return NextResponse.json({
    ...serialise(session, messages, suggestions),
    // Tells the widget to show the name / contact form.
    askForDetails: handoff,
  });
}

/** Polls for anything the agent has said since `after`. */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const token = url.searchParams.get("token");
  const after = url.searchParams.get("after");
  if (!token) return NextResponse.json({ error: "Missing token" }, { status: 400 });

  const session = await prisma.chatSession.findUnique({ where: { token } });
  if (!session) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const since = after ? new Date(after) : undefined;
  const messages = await prisma.chatMessage.findMany({
    where: {
      sessionId: session.id,
      ...(since && !Number.isNaN(since.getTime()) ? { createdAt: { gt: since } } : {}),
    },
    orderBy: { createdAt: "asc" },
    take: 50,
  });

  return NextResponse.json({
    status: session.closedAt ? "CLOSED" : session.status,
    messages: messages.map((m) => ({ id: m.id, role: m.role, body: m.body, at: m.createdAt.toISOString() })),
  });
}
