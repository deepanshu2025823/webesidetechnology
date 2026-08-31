import { NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { alertNewLead } from "@/lib/alerts";
import { clientIp, rateLimit } from "@/lib/rate-limit";

const schema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(120),
  email: z.email("Enter a valid email address").max(190),
  phone: z.string().trim().max(60).optional().default(""),
  company: z.string().trim().max(190).optional().default(""),
  serviceInterest: z.string().trim().max(190).optional().default(""),
  budget: z.string().trim().max(80).optional().default(""),
  message: z.string().trim().min(10, "Tell us a little more about the project").max(4000),
  source: z.string().trim().max(80).optional().default("website"),
  pageUrl: z.string().trim().max(500).optional().default(""),
  company_website: z.string().optional(), // honeypot
});

export async function POST(request: Request) {
  const ip = clientIp(request.headers);
  const limit = rateLimit(`contact:${ip}`, 5, 60_000);
  if (!limit.ok) {
    return NextResponse.json(
      { error: "Too many submissions. Please try again in a minute." },
      { status: 429, headers: { "Retry-After": String(limit.retryAfter ?? 60) } },
    );
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request" }, { status: 400 });
  }

  const parsed = schema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Please check the form" }, { status: 400 });
  }

  const data = parsed.data;

  // Bots fill hidden fields; accept silently so they do not retry.
  if (data.company_website) {
    return NextResponse.json({ message: "Thanks — we'll be in touch shortly." });
  }

  let enquiryId: string;
  try {
    const created = await prisma.enquiry.create({
      data: {
        name: data.name,
        email: data.email.toLowerCase(),
        phone: data.phone,
        company: data.company,
        serviceInterest: data.serviceInterest,
        budget: data.budget,
        message: data.message,
        source: data.source,
        pageUrl: data.pageUrl,
        ipAddress: ip,
        userAgent: request.headers.get("user-agent")?.slice(0, 400) ?? "",
      },
    });
    enquiryId = created.id;
  } catch (error) {
    console.error("[contact] could not save enquiry", error);
    return NextResponse.json({ error: "We could not save your message. Please call us instead." }, { status: 500 });
  }

  // Notifies the bell and the official mailboxes; never throws.
  await alertNewLead(enquiryId);

  return NextResponse.json({ message: "Thanks — we'll be in touch within one working day." });
}
