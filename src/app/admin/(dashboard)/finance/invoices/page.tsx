import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { cn, formatDate, formatMoney } from "@/lib/utils";

const TONE = {
  DRAFT: "muted",
  SENT: "neutral",
  PARTIALLY_PAID: "warn",
  PAID: "success",
  OVERDUE: "warn",
  CANCELLED: "muted",
} as const;

const STATUSES = ["ALL", "DRAFT", "SENT", "PARTIALLY_PAID", "OVERDUE", "PAID", "CANCELLED"];
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; client?: string }>;
}) {
  const session = await requireModule("finance");
  const { status, client } = await searchParams;

  const invoices = await prisma.invoice.findMany({
    where: {
      ...(status && status !== "ALL" ? { status: status as never } : {}),
      ...(client ? { clientId: client } : {}),
    },
    orderBy: { issueDate: "desc" },
    include: { client: { select: { id: true, name: true } } },
  });

  const editable = canEdit(session.role, "finance");
  const total = invoices.reduce((sum, i) => sum + i.total, 0);
  const due = invoices.reduce((sum, i) => sum + (i.total - i.amountPaid), 0);

  return (
    <>
      <PageHeader
        title="Invoices"
        description={`${formatMoney(total)} invoiced · ${formatMoney(due)} outstanding`}
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

      <nav className="mb-5 flex flex-wrap gap-2">
        {STATUSES.map((s) => (
          <Link
            key={s}
            href={s === "ALL" ? "/admin/finance/invoices" : `/admin/finance/invoices?status=${s}`}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              (status ?? "ALL") === s
                ? "bg-navy-900 text-white"
                : "border border-navy-900/15 text-navy-700 hover:border-gold-500 hover:bg-gold-50",
            )}
          >
            {pretty(s)}
          </Link>
        ))}
      </nav>

      {invoices.length === 0 ? (
        <EmptyState
          title="No invoices here"
          description="Create one directly, or convert an accepted quotation from its page."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 text-right font-medium">Balance</th>
                  <th className="px-5 py-3 font-medium">Due</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {invoices.map((invoice) => {
                  const balance = invoice.total - invoice.amountPaid;
                  const overdue = invoice.dueDate && invoice.dueDate < new Date() && balance > 0;
                  return (
                    <tr key={invoice.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/finance/invoices/${invoice.id}`} className="block">
                          <span className="block font-medium text-navy-900 hover:text-gold-700">{invoice.title}</span>
                          <span className="block text-xs text-slate-500">{invoice.number}</span>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/clients/${invoice.client.id}`} className="text-slate-600 hover:text-gold-700">
                          {invoice.client.name}
                        </Link>
                      </td>
                      <td className="px-5 py-3.5">
                        <Badge tone={TONE[invoice.status]}>{pretty(invoice.status)}</Badge>
                      </td>
                      <td className="px-5 py-3.5 text-right text-slate-600">{formatMoney(invoice.total)}</td>
                      <td className={cn("px-5 py-3.5 text-right font-medium", balance > 0 ? "text-navy-900" : "text-emerald-700")}>
                        {formatMoney(balance)}
                      </td>
                      <td className={cn("px-5 py-3.5 text-xs", overdue ? "font-medium text-red-600" : "text-slate-500")}>
                        {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
