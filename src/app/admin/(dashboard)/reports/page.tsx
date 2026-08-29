import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { Card, PageHeader } from "@/components/admin/ui";
import { cn, formatMoney } from "@/lib/utils";

/**
 * The reporting cockpit from scope section 19 — management, sales, delivery,
 * finance, team, renewals and the growth network, all computed live.
 */
export default async function ReportsPage({
  searchParams,
}: {
  searchParams: Promise<{ months?: string }>;
}) {
  await requireModule("reports");
  const { months } = await searchParams;
  const window = Math.max(1, Math.min(24, Number(months) || 6));

  const now = new Date();
  const nowMs = now.getTime();
  const since = new Date();
  since.setMonth(since.getMonth() - window);

  const [
    leads,
    quotations,
    invoices,
    payments,
    expenses,
    projects,
    tasks,
    renewals,
    employees,
    attendance,
    partners,
    influencerCampaigns,
    adPerformance,
    contentItems,
    seoReports,
  ] = await Promise.all([
    prisma.enquiry.findMany({ where: { createdAt: { gte: since } }, select: { status: true, source: true, serviceInterest: true } }),
    prisma.quotation.findMany({ where: { createdAt: { gte: since } }, select: { status: true, total: true } }),
    prisma.invoice.findMany({ select: { status: true, total: true, amountPaid: true, dueDate: true } }),
    prisma.payment.findMany({ where: { paidAt: { gte: since } }, select: { amount: true } }),
    prisma.expense.findMany({ where: { spentAt: { gte: since } }, select: { amount: true, serviceId: true } }),
    prisma.clientProject.findMany({ select: { stage: true, health: true, budget: true, serviceId: true } }),
    prisma.task.findMany({ select: { status: true, assigneeId: true, dueDate: true } }),
    prisma.renewal.findMany({ select: { status: true, amount: true, expiryDate: true } }),
    prisma.employee.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
    prisma.attendance.findMany({ where: { date: { gte: since } }, select: { employeeId: true, status: true } }),
    prisma.partnerReward.findMany({ select: { status: true, amount: true } }),
    prisma.influencerCampaign.findMany({ select: { status: true, cost: true, paidAmount: true } }),
    prisma.adPerformance.findMany({ where: { date: { gte: since } }, select: { spend: true, leads: true, conversions: true, revenue: true } }),
    prisma.contentItem.findMany({ select: { stage: true } }),
    prisma.seoReport.findMany({ where: { month: { gte: since } }, select: { organicTraffic: true, keywordsTop3: true, keywordsTop10: true } }),
  ]);

  const won = leads.filter((l) => l.status === "WON").length;
  const lost = leads.filter((l) => l.status === "LOST").length;
  const conversion = leads.length ? Math.round((won / leads.length) * 100) : 0;

  const quotedValue = quotations.reduce((s, q) => s + q.total, 0);
  const acceptedValue = quotations.filter((q) => q.status === "ACCEPTED").reduce((s, q) => s + q.total, 0);

  const invoiced = invoices.reduce((s, i) => s + i.total, 0);
  const collected = invoices.reduce((s, i) => s + i.amountPaid, 0);
  const outstanding = invoiced - collected;
  const overdueValue = invoices
    .filter((i) => i.dueDate && i.dueDate < now && i.total > i.amountPaid)
    .reduce((s, i) => s + (i.total - i.amountPaid), 0);

  const collectedWindow = payments.reduce((s, p) => s + p.amount, 0);
  const spentWindow = expenses.reduce((s, e) => s + e.amount, 0);
  const profit = collectedWindow - spentWindow;

  const activeProjects = projects.filter((p) => p.stage === "ACTIVE").length;
  const atRisk = projects.filter((p) => p.health !== "ON_TRACK").length;
  const openTasks = tasks.filter((t) => t.status !== "DONE").length;
  const overdueTasks = tasks.filter((t) => t.status !== "DONE" && t.dueDate && t.dueDate < now).length;

  const dueRenewals = renewals.filter((r) => r.status === "ACTIVE" || r.status === "DUE");
  const renewalValue = dueRenewals.reduce((s, r) => s + r.amount, 0);
  const renewedCount = renewals.filter((r) => r.status === "RENEWED").length;
  const lostRenewals = renewals.filter((r) => r.status === "LOST").length;

  const adSpend = adPerformance.reduce((s, p) => s + p.spend, 0);
  const adLeads = adPerformance.reduce((s, p) => s + p.leads, 0);
  const adRevenue = adPerformance.reduce((s, p) => s + p.revenue, 0);

  const published = contentItems.filter((c) => c.stage === "PUBLISHED").length;
  const awaitingClient = contentItems.filter((c) => c.stage === "CLIENT_APPROVAL").length;

  const organicTraffic = seoReports.reduce((s, r) => s + r.organicTraffic, 0);
  const top3 = seoReports.reduce((max, r) => Math.max(max, r.keywordsTop3), 0);

  const rewardsPaid = partners.filter((p) => p.status === "PAID").reduce((s, p) => s + p.amount, 0);
  const rewardsPending = partners.filter((p) => p.status === "PENDING").reduce((s, p) => s + p.amount, 0);
  const influencerSpend = influencerCampaigns.reduce((s, c) => s + c.paidAmount, 0);

  const utilisation = employees.map((e) => {
    const days = attendance.filter((a) => a.employeeId === e.id);
    const present = days.filter((a) => a.status === "PRESENT").length;
    return { name: e.name, present, recorded: days.length };
  });

  const board = (title: string, rows: [string, string, ("good" | "warn" | undefined)?][]) => (
    <Card title={title}>
      <dl className="space-y-3">
        {rows.map(([label, value, tone]) => (
          <div key={label} className="flex items-baseline justify-between gap-4">
            <dt className="text-sm text-slate-600">{label}</dt>
            <dd
              className={cn(
                "text-right font-medium text-navy-900",
                tone === "good" && "text-emerald-700",
                tone === "warn" && "text-red-600",
              )}
            >
              {value}
            </dd>
          </div>
        ))}
      </dl>
    </Card>
  );

  return (
    <>
      <PageHeader
        title="Reports"
        description={`Live figures across the last ${window} month${window === 1 ? "" : "s"}.`}
      />

      <nav className="mb-6 flex flex-wrap gap-2">
        {[1, 3, 6, 12].map((m) => (
          <Link
            key={m}
            href={`/admin/reports?months=${m}`}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              window === m
                ? "bg-navy-900 text-white"
                : "border border-navy-900/15 text-navy-700 hover:border-gold-500 hover:bg-gold-50",
            )}
          >
            {m} month{m === 1 ? "" : "s"}
          </Link>
        ))}
      </nav>

      <div className="grid gap-6 lg:grid-cols-2 xl:grid-cols-3">
        {board("Management", [
          ["Collected", formatMoney(collectedWindow), "good"],
          ["Expenses", formatMoney(spentWindow)],
          ["Gross profit", formatMoney(profit), profit >= 0 ? "good" : "warn"],
          ["Receivables", formatMoney(outstanding), outstanding > 0 ? "warn" : undefined],
          ["Active projects", String(activeProjects)],
          ["Renewals at stake", formatMoney(renewalValue)],
        ])}

        {board("Sales", [
          ["Leads", String(leads.length)],
          ["Won", String(won), "good"],
          ["Lost", String(lost)],
          ["Conversion", `${conversion}%`],
          ["Quoted value", formatMoney(quotedValue)],
          ["Accepted value", formatMoney(acceptedValue), "good"],
        ])}

        {board("Delivery", [
          ["Projects", String(projects.length)],
          ["Active", String(activeProjects)],
          ["Needing attention", String(atRisk), atRisk ? "warn" : undefined],
          ["Open tasks", String(openTasks)],
          ["Overdue tasks", String(overdueTasks), overdueTasks ? "warn" : undefined],
          ["Committed budget", formatMoney(projects.reduce((s, p) => s + p.budget, 0))],
        ])}

        {board("Finance", [
          ["Invoiced", formatMoney(invoiced)],
          ["Collected", formatMoney(collected), "good"],
          ["Outstanding", formatMoney(outstanding)],
          ["Overdue", formatMoney(overdueValue), overdueValue ? "warn" : undefined],
          ["Invoices raised", String(invoices.length)],
          ["Paid in full", String(invoices.filter((i) => i.status === "PAID").length)],
        ])}

        {board("Renewals", [
          ["Upcoming", String(dueRenewals.length)],
          ["Value at stake", formatMoney(renewalValue)],
          ["Renewed", String(renewedCount), "good"],
          ["Lost", String(lostRenewals), lostRenewals ? "warn" : undefined],
          [
            "Expiring in 30 days",
            String(dueRenewals.filter((r) => (r.expiryDate.getTime() - nowMs) / 86_400_000 <= 30).length),
          ],
        ])}

        {board("Ads", [
          ["Spend", formatMoney(adSpend)],
          ["Leads", String(adLeads)],
          ["Cost per lead", adLeads ? formatMoney(Math.round(adSpend / adLeads)) : "—"],
          ["Conversions", String(adPerformance.reduce((s, p) => s + p.conversions, 0))],
          ["Attributed revenue", formatMoney(adRevenue)],
          ["ROAS", adSpend ? `${(adRevenue / adSpend).toFixed(2)}x` : "—"],
        ])}

        {board("Social media", [
          ["Pieces published", String(published), "good"],
          ["Awaiting client", String(awaitingClient), awaitingClient ? "warn" : undefined],
          ["In production", String(contentItems.filter((c) => ["COPY", "DESIGN"].includes(c.stage)).length)],
          ["Total planned", String(contentItems.length)],
        ])}

        {board("SEO", [
          ["Organic sessions", organicTraffic.toLocaleString("en-IN")],
          ["Best month, top 3", String(top3)],
          ["Reports filed", String(seoReports.length)],
        ])}

        {board("Team", [
          ["People", String(employees.length)],
          ["Attendance records", String(attendance.length)],
          ["Present days", String(attendance.filter((a) => a.status === "PRESENT").length)],
          ["Leave days", String(attendance.filter((a) => a.status === "LEAVE").length)],
        ])}

        {board("Influencers & partners", [
          ["Influencer campaigns", String(influencerCampaigns.length)],
          ["Influencer spend", formatMoney(influencerSpend)],
          ["Rewards paid", formatMoney(rewardsPaid), "good"],
          ["Rewards pending", formatMoney(rewardsPending), rewardsPending ? "warn" : undefined],
        ])}
      </div>

      {utilisation.length ? (
        <Card title="Team utilisation" className="mt-6">
          <ul className="divide-y divide-navy-900/5">
            {utilisation.map((row) => (
              <li key={row.name} className="flex items-center gap-4 py-2.5 text-sm">
                <span className="w-40 shrink-0 truncate text-navy-900">{row.name}</span>
                <span className="h-2 flex-1 rounded-full bg-slate-100">
                  <span
                    className="block h-2 rounded-full bg-gold-500"
                    style={{ width: `${row.recorded ? Math.round((row.present / row.recorded) * 100) : 0}%` }}
                  />
                </span>
                <span className="w-28 shrink-0 text-right text-xs text-slate-500">
                  {row.present} / {row.recorded} days
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
