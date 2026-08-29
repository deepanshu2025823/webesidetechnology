import { prisma } from "@/lib/prisma";
import { requirePortalSession } from "@/lib/portal-auth";
import { formatDate, formatMoney } from "@/lib/utils";
import { cn } from "@/lib/utils";

const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export default async function PortalInvoicesPage() {
  const session = await requirePortalSession();

  const invoices = await prisma.invoice.findMany({
    // Drafts are internal until they are actually sent.
    where: { clientId: session.clientId, status: { not: "DRAFT" } },
    orderBy: { issueDate: "desc" },
    include: { payments: { orderBy: { paidAt: "desc" } } },
  });

  const outstanding = invoices.reduce((sum, i) => sum + Math.max(0, i.total - i.amountPaid), 0);

  return (
    <>
      <h1 className="text-2xl font-semibold text-navy-900">Invoices</h1>
      <p className="mt-1 text-sm text-slate-500">
        {outstanding ? `${formatMoney(outstanding)} outstanding.` : "Everything is settled — thank you."}
      </p>

      {invoices.length ? (
        <div className="mt-6 overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Invoice</th>
                  <th className="px-5 py-3 font-medium">Issued</th>
                  <th className="px-5 py-3 font-medium">Due</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Total</th>
                  <th className="px-5 py-3 text-right font-medium">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {invoices.map((invoice) => {
                  const balance = Math.max(0, invoice.total - invoice.amountPaid);
                  const overdue = invoice.dueDate && invoice.dueDate < new Date() && balance > 0;
                  return (
                    <tr key={invoice.id}>
                      <td className="px-5 py-3.5">
                        <span className="font-medium text-navy-900">{invoice.title}</span>
                        <span className="block text-xs text-slate-500">{invoice.number}</span>
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{formatDate(invoice.issueDate)}</td>
                      <td className={cn("px-5 py-3.5 text-xs", overdue ? "font-medium text-red-600" : "text-slate-500")}>
                        {invoice.dueDate ? formatDate(invoice.dueDate) : "—"}
                      </td>
                      <td className="px-5 py-3.5 text-xs capitalize text-slate-600">{pretty(invoice.status)}</td>
                      <td className="px-5 py-3.5 text-right text-slate-600">{formatMoney(invoice.total)}</td>
                      <td className={cn("px-5 py-3.5 text-right font-medium", balance ? "text-navy-900" : "text-emerald-700")}>
                        {formatMoney(balance)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-navy-900/20 bg-white px-6 py-10 text-center text-sm text-slate-500">
          No invoices yet.
        </p>
      )}
    </>
  );
}
