import Link from "next/link";
import { AlertTriangle, FileText, Plus, Receipt, TrendingDown, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { cn, formatDate, formatMoney } from "@/lib/utils";

const TONE = {
  DRAFT: "muted",
  SENT: "neutral",
  PARTIALLY_PAID: "warn",
  PAID: "success",
  OVERDUE: "warn",
  CANCELLED: "muted",
} as const;

/** Aging buckets from scope section 17. */
const BUCKETS = [
  { label: "Not due", min: -99999, max: 0 },
  { label: "1–30 days", min: 1, max: 30 },
  { label: "31–60 days", min: 31, max: 60 },
  { label: "61–90 days", min: 61, max: 90 },
  { label: "90+ days", min: 91, max: 99999 },
];

export default async function FinancePage() {
  const session = await requireModule("finance");
  const now = new Date();
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

  const [open, monthPayments, monthExpenses, recentInvoices, recentPayments] = await Promise.all([
    prisma.invoice.findMany({
      where: { status: { in: ["SENT", "PARTIALLY_PAID", "OVERDUE"] } },
      include: { client: { select: { name: true } } },
    }),
    prisma.payment.aggregate({ _sum: { amount: true }, where: { paidAt: { gte: monthStart } } }),
    prisma.expense.aggregate({ _sum: { amount: true }, where: { spentAt: { gte: monthStart } } }),
    prisma.invoice.findMany({
      orderBy: { createdAt: "desc" },
      take: 8,
      include: { client: { select: { name: true } } },
    }),
    prisma.payment.findMany({
      orderBy: { paidAt: "desc" },
      take: 8,
      include: { client: { select: { name: true } }, invoice: { select: { number: true, id: true } } },
    }),
  ]);

  const outstanding = open.reduce((sum, i) => sum + (i.total - i.amountPaid), 0);
  const overdue = open.filter((i) => i.dueDate && i.dueDate < now);
  const overdueValue = overdue.reduce((sum, i) => sum + (i.total - i.amountPaid), 0);

  const aging = BUCKETS.map((bucket) => {
    const rows = open.filter((invoice) => {
      const days = invoice.dueDate
        ? Math.floor((now.getTime() - invoice.dueDate.getTime()) / 86_400_000)
        : 0;
      return days >= bucket.min && days <= bucket.max;
    });
    return { ...bucket, count: rows.length, value: rows.reduce((sum, i) => sum + (i.total - i.amountPaid), 0) };
  });

  const collected = monthPayments._sum.amount ?? 0;
  const spent = monthExpenses._sum.amount ?? 0;
  const editable = canEdit(session.role, "finance");

  const tiles = [
    { label: "Outstanding", value: formatMoney(outstanding), sub: `${open.length} open invoice${open.length === 1 ? "" : "s"}`, icon: Wallet, href: "/admin/finance/invoices" },
    { label: "Overdue", value: formatMoney(overdueValue), sub: `${overdue.length} past due date`, icon: AlertTriangle, href: "/admin/finance/invoices?status=OVERDUE" },
    { label: "Collected this month", value: formatMoney(collected), sub: "Payments received", icon: Receipt, href: "/admin/finance/payments" },
    { label: "Spent this month", value: formatMoney(spent), sub: "Recorded expenses", icon: TrendingDown, href: "/admin/finance/expenses" },
  ];

  return (
    <>
      <PageHeader
        title="Finance"
        description="Invoices, collections, outstanding balances and expenses."
        actions={
          editable ? (
            <Link
              href="/admin/finance/invoices/new"
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              <Plus className="size-4" aria-hidden /> New invoice
            </Link>
          ) : null
        }
      />

      <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {tiles.map(({ label, value, sub, icon: Icon, href }) => (
          <li key={label}>
            <Link
              href={href}
              className="flex h-full items-start gap-4 rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold-400/60"
            >
              <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-gold-400">
                <Icon className="size-5" aria-hidden />
              </span>
              <span className="min-w-0">
                <span className="block truncate text-xl font-semibold text-navy-900">{value}</span>
                <span className="mt-0.5 block text-sm font-medium text-navy-800">{label}</span>
                <span className="block text-xs text-slate-500">{sub}</span>
              </span>
            </Link>
          </li>
        ))}
      </ul>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <Card title="Receivables ageing" className="lg:col-span-1">
          <ul className="space-y-3">
            {aging.map((bucket) => (
              <li key={bucket.label} className="flex items-center justify-between text-sm">
                <span className={cn("text-slate-600", bucket.min > 60 && bucket.value > 0 && "font-medium text-red-600")}>
                  {bucket.label}
                </span>
                <span className="text-right">
                  <span className="block font-medium text-navy-900">{formatMoney(bucket.value)}</span>
                  <span className="block text-xs text-slate-400">
                    {bucket.count} invoice{bucket.count === 1 ? "" : "s"}
                  </span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        <Card title="Recent invoices" className="lg:col-span-2">
          {recentInvoices.length ? (
            <ul className="divide-y divide-navy-900/5">
              {recentInvoices.map((invoice) => (
                <li key={invoice.id}>
                  <Link
                    href={`/admin/finance/invoices/${invoice.id}`}
                    className="-mx-2 flex items-center gap-3 rounded-lg px-2 py-3 hover:bg-slate-50"
                  >
                    <FileText className="size-4 shrink-0 text-slate-400" aria-hidden />
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-sm font-medium text-navy-900">{invoice.title}</span>
                      <span className="block truncate text-xs text-slate-500">
                        {invoice.number} · {invoice.client.name}
                      </span>
                    </span>
                    <Badge tone={TONE[invoice.status]}>{invoice.status.toLowerCase().replace("_", " ")}</Badge>
                    <span className="w-24 shrink-0 text-right text-sm font-medium text-navy-900">
                      {formatMoney(invoice.total)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">No invoices yet.</p>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Recent payments">
          {recentPayments.length ? (
            <ul className="divide-y divide-navy-900/5">
              {recentPayments.map((payment) => (
                <li key={payment.id} className="flex items-center gap-3 py-3">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium text-navy-900">{payment.client.name}</span>
                    <span className="block text-xs text-slate-500">
                      <Link href={`/admin/finance/invoices/${payment.invoice.id}`} className="hover:text-gold-700">
                        {payment.invoice.number}
                      </Link>{" "}
                      · {payment.mode.toLowerCase().replace("_", " ")}
                      {payment.reference ? ` · ${payment.reference}` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-slate-400">{formatDate(payment.paidAt)}</span>
                  <span className="w-24 shrink-0 text-right text-sm font-medium text-emerald-700">
                    {formatMoney(payment.amount)}
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="py-6 text-center text-sm text-slate-500">No payments recorded yet.</p>
          )}
        </Card>
      </div>
    </>
  );
}
