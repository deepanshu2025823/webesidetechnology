import { NextResponse } from "next/server";
import { moneyReminderSweep, overdueInvoiceSweep, renewalReminderSweep, taskAlertSweep } from "@/lib/automation";

/**
 * Nightly automation. Point a scheduler at this once a day:
 *
 *   curl -H "Authorization: Bearer $CRON_SECRET" https://site/api/cron/daily
 *
 * Runs renewal reminders and escalation, overdue invoices, income and expense
 * reminders, and task due/overdue alerts — scope sections 8, 17 and 18.
 */
export async function GET(request: Request) {
  const secret = process.env.CRON_SECRET;
  if (secret) {
    const provided = request.headers.get("authorization")?.replace(/^Bearer\s+/i, "");
    if (provided !== secret) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const started = Date.now();
  const [renewals, invoices, money, tasks] = await Promise.all([
    renewalReminderSweep(),
    overdueInvoiceSweep(),
    moneyReminderSweep(),
    taskAlertSweep(),
  ]);

  return NextResponse.json({
    ranAt: new Date().toISOString(),
    tookMs: Date.now() - started,
    renewals,
    invoices,
    money,
    tasks,
  });
}
