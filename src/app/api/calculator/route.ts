import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { alertNewLead } from "@/lib/alerts";
import { estimate, summarise, type CalcGroup } from "@/lib/calculator";
import { clientIp, rateLimit } from "@/lib/rate-limit";

/**
 * Turns a calculator submission into a lead.
 *
 * The browser sends only the selection, never a price: the total is recomputed
 * here from the configuration in the database, so what the sales team reads is
 * always the real number even if the payload was tampered with.
 */

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.email("Enter a valid email address").max(190),
  phone: z.string().trim().max(60).optional().default(""),
  company: z.string().trim().max(190).optional().default(""),
  notes: z.string().trim().max(2000).optional().default(""),
  selection: z.object({
    options: z.record(z.string(), z.array(z.string().max(64)).max(50)),
    quantities: z.record(z.string(), z.number().int().min(1).max(999)),
  }),
});

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = rateLimit(`calculator:${ip}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again in a minute." },
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
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form" }, { status: 400 });
  }

  const data = parsed.data;

  const [rows, settings] = await Promise.all([
    prisma.calculatorGroup.findMany({
      where: { isActive: true },
      orderBy: { order: "asc" },
      include: { options: { orderBy: { order: "asc" } } },
    }),
    prisma.calculatorSettings.findUnique({ where: { id: 1 } }),
  ]);

  const groups = rows as unknown as CalcGroup[];
  const config = {
    basePrice: settings?.basePrice ?? 0,
    taxPercent: settings?.taxPercent ?? 18,
    variancePct: settings?.variancePct ?? 15,
  };

  const result = estimate(groups, data.selection, config);
  const money = (n: number) => `₹${n.toLocaleString("en-IN")}`;

  let leadId: string;
  try {
    const lead = await prisma.enquiry.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        company: data.company,
        serviceInterest: "Cost calculator estimate",
        budget: `${money(result.low)} – ${money(result.high)}`,
        message: [summarise(groups, data.selection, result), data.notes && `\nTheir note: ${data.notes}`]
          .filter(Boolean)
          .join("\n"),
        source: "calculator",
        pageUrl: "/cost-calculator",
        ipAddress: ip,
        userAgent: request.headers.get("user-agent")?.slice(0, 400) ?? "",
        // Someone who has priced their own project is well past a cold enquiry.
        score: 60,
      },
    });
    leadId = lead.id;
  } catch (error) {
    console.error("[calculator] could not save the estimate", error);
    return NextResponse.json({ error: "We could not save your estimate. Please call us instead." }, { status: 500 });
  }

  await alertNewLead(leadId);

  return NextResponse.json({ message: "Thanks — your estimate is with the team." });
}
