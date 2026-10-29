import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { istDay } from "@/lib/activity";

/**
 * Heartbeat from an open admin tab: one active minute.
 *
 * The client only sends it while the tab is visible and someone has typed or
 * moved the mouse recently. Pings closer together than 50 seconds are ignored,
 * so three open tabs still count as one person working, not three.
 */
export async function POST() {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const now = new Date();
  const date = istDay(now);
  const key = { userId_date: { userId: session.id, date } };

  const day = await prisma.activityDay.findUnique({ where: key, select: { id: true, lastSeenAt: true } });
  if (!day) {
    try {
      await prisma.activityDay.create({
        data: { userId: session.id, date, activeMinutes: 1, firstSeenAt: now, lastSeenAt: now },
      });
    } catch {
      // Another tab created the row a moment earlier; this minute is theirs.
    }
    return NextResponse.json({ ok: true });
  }

  await prisma.activityDay.updateMany({
    where: { id: day.id, OR: [{ lastSeenAt: null }, { lastSeenAt: { lt: new Date(now.getTime() - 50_000) } }] },
    data: { activeMinutes: { increment: 1 }, lastSeenAt: now },
  });
  return NextResponse.json({ ok: true });
}
