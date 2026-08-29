import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { formatDate, formatMoney } from "@/lib/utils";

const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export default async function PaymentsPage() {
  await requireModule("finance");

  const payments = await prisma.payment.findMany({
    orderBy: { paidAt: "desc" },
    take: 300,
    include: {
      client: { select: { id: true, name: true } },
      invoice: { select: { id: true, number: true, title: true } },
      recordedBy: { select: { name: true } },
    },
  });

  const total = payments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <>
      <PageHeader title="Payments" description={`${formatMoney(total)} received across ${payments.length} entries.`} />

      {payments.length === 0 ? (
        <EmptyState title="No payments yet" description="Record payments from an invoice page." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-5 py-3 font-medium">Mode</th>
                  <th className="px-5 py-3 font-medium">Reference</th>
                  <th className="px-5 py-3 font-medium">Recorded by</th>
                  <th className="px-5 py-3 font-medium">Date</th>
                  <th className="px-5 py-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {payments.map((payment) => (
                  <tr key={payment.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/clients/${payment.client.id}`} className="font-medium text-navy-900 hover:text-gold-700">
                        {payment.client.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/finance/invoices/${payment.invoice.id}`} className="text-slate-600 hover:text-gold-700">
                        {payment.invoice.number}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{pretty(payment.mode)}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{payment.reference || "—"}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{payment.recordedBy?.name ?? "—"}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{formatDate(payment.paidAt)}</td>
                    <td className="px-5 py-3.5 text-right font-medium text-emerald-700">{formatMoney(payment.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
