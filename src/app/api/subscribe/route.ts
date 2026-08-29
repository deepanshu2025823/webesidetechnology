import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  email: z.email("Enter a valid email address").max(190),
  name: z.string().trim().max(160).optional().default(""),
  source: z.string().trim().max(80).optional().default("footer"),
});

export async function POST(request: Request) {
  const limit = rateLimit(`subscribe:${clientIp(request.headers)}`, 5, 60_000);
  if (!limit.ok) return NextResponse.json({ error: "Too many attempts. Try again shortly." }, { status: 429 });

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Invalid email" }, { status: 400 });
  }

  const email = parsed.data.email.toLowerCase();

  try {
    await prisma.subscriber.upsert({
      where: { email },
      create: { email, name: parsed.data.name, source: parsed.data.source },
      update: { isActive: true },
    });
  } catch (error) {
    console.error("[subscribe] failed", error);
    return NextResponse.json({ error: "Could not subscribe right now." }, { status: 500 });
  }

  return NextResponse.json({ message: "You're on the list." });
}
