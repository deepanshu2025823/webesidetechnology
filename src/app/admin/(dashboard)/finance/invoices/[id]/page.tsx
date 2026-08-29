import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, BellRing, Pencil, Printer, Trash2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import {
  deletePayment,
  issueCreditNote,
  recordPayment,
  sendPaymentReminder,
  setInvoiceStatus,
} from "@/app/admin/actions/finance";
import { Badge, Card, PageHeader, inputClass } from "@/components/admin/ui";
import { formatDate, formatMoney } from "@/lib/utils";

const TONE = {
  DRAFT: "muted",
  SENT: "neutral",
  PARTIALLY_PAID: "warn",
  PAID: "success",
  OVERDUE: "warn",
  CANCELLED: "muted",
} as const;

const STATUSES = ["DRAFT", "SENT", "PARTIALLY_PAID", "PAID", "OVERDUE", "CANCELLED"];
const MODES = ["BANK_TRANSFER", "UPI", "CASH", "CARD", "CHEQUE", "GATEWAY"];
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export default async function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModule("finance");
  const { id } = await params;

  const invoice = await prisma.invoice.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, addressLine: true, city: true, state: true, gstin: true } },
      project: { select: { id: true, name: true } },
      quotation: { select: { id: true, number: true } },
      owner: { select: { name: true } },
      items: { orderBy: { order: "asc" } },
      payments: { orderBy: { paidAt: "desc" }, include: { recordedBy: { select: { name: true } } } },
      creditNotes: { orderBy: { issuedAt: "desc" } },
    },
  });
  if (!invoice) notFound();

  const editable = canEdit(session.role, "finance");
  const credited = invoice.creditNotes.reduce((sum, c) => sum + c.amount, 0);
  const balance = invoice.total - credited - invoice.amountPaid;

  const discount = Math.round(invoice.subtotal * (invoice.discountPct / 100));
  const tax = invoice.total - (invoice.subtotal - discount);

  const pay = recordPayment.bind(null, id);
  const credit = issueCreditNote.bind(null, id);
  const status = setInvoiceStatus.bind(null, id);
  const remind = sendPaymentReminder.bind(null, id);

  const address = [invoice.client.addressLine, invoice.client.city, invoice.client.state].filter(Boolean).join(", ");

  return (
    <>
      <Link href="/admin/finance/invoices" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All invoices
      </Link>

      <PageHeader
        title={invoice.title}
        description={`${invoice.number} · ${invoice.client.name}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/print/invoice/${invoice.id}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
            >
              <Printer className="size-4" aria-hidden /> Print / PDF
            </Link>
            {editable ? (
              <>
                <Link
                  href={`/admin/finance/invoices/${invoice.id}/edit`}
                  className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
                >
                  <Pencil className="size-4" aria-hidden /> Edit
                </Link>
                {balance > 0 ? (
                  <form action={remind}>
                    <button
                      type="submit"
                      className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
                    >
                      <BellRing className="size-4" aria-hidden /> Send reminder
                    </button>
                  </form>
                ) : null}
              </>
            ) : null}
          </div>
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <div className="mb-6 flex flex-wrap items-start justify-between gap-4 border-b border-navy-900/10 pb-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-500">Billed to</p>
                <p className="mt-1 font-medium text-navy-900">{invoice.client.name}</p>
                {address ? <p className="text-sm text-slate-600">{address}</p> : null}
                {invoice.client.gstin ? <p className="text-xs text-slate-500">GSTIN {invoice.client.gstin}</p> : null}
              </div>
              <div className="text-right">
                <p className="font-display text-lg text-navy-900">{invoice.number}</p>
                <Badge tone={TONE[invoice.status]}>{pretty(invoice.status)}</Badge>
                <p className="mt-2 text-xs text-slate-500">Issued {formatDate(invoice.issueDate)}</p>
                {invoice.dueDate ? <p className="text-xs text-slate-500">Due {formatDate(invoice.dueDate)}</p> : null}
              </div>
            </div>

            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-3 font-medium">Item</th>
                  <th className="pb-3 text-center font-medium">Qty</th>
                  <th className="pb-3 text-right font-medium">Rate</th>
                  <th className="pb-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {invoice.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-4">
                      <span className="font-medium text-navy-900">{item.title}</span>
                      {item.description ? <span className="mt-0.5 block text-xs text-slate-500">{item.description}</span> : null}
                    </td>
                    <td className="py-3 text-center text-slate-600">{item.quantity}</td>
                    <td className="py-3 text-right text-slate-600">{formatMoney(item.unitPrice)}</td>
                    <td className="py-3 text-right font-medium text-navy-900">{formatMoney(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>

            <dl className="mt-6 space-y-2 border-t border-navy-900/10 pt-4 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Subtotal</dt>
                <dd className="text-navy-900">{formatMoney(invoice.subtotal)}</dd>
              </div>
              {discount ? (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Discount ({invoice.discountPct}%)</dt>
                  <dd className="text-navy-900">− {formatMoney(discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-slate-500">Tax ({invoice.taxPct}%)</dt>
                <dd className="text-navy-900">{formatMoney(tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-navy-900/10 pt-3">
                <dt className="font-semibold text-navy-900">Invoice total</dt>
                <dd className="font-display text-xl text-navy-900">{formatMoney(invoice.total)}</dd>
              </div>
              {credited ? (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Credit notes</dt>
                  <dd className="text-navy-900">− {formatMoney(credited)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-slate-500">Paid</dt>
                <dd className="text-emerald-700">{formatMoney(invoice.amountPaid)}</dd>
              </div>
              <div className="flex justify-between border-t border-navy-900/10 pt-3">
                <dt className="font-semibold text-navy-900">Balance due</dt>
                <dd className="font-display text-xl text-navy-900">{formatMoney(Math.max(0, balance))}</dd>
              </div>
            </dl>

            {invoice.terms ? (
              <div className="mt-6 border-t border-navy-900/10 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Terms</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{invoice.terms}</p>
              </div>
            ) : null}
          </Card>

          <Card title="Payments">
            {editable ? (
              <form action={pay} className="mb-5 grid gap-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4 sm:grid-cols-12">
                <input
                  name="amount"
                  type="number"
                  min={1}
                  required
                  placeholder="Amount ₹"
                  defaultValue={balance > 0 ? balance : ""}
                  className={`${inputClass} sm:col-span-3`}
                  aria-label="Payment amount"
                />
                <select name="mode" defaultValue="BANK_TRANSFER" className={`${inputClass} sm:col-span-3`} aria-label="Payment mode">
                  {MODES.map((m) => (
                    <option key={m} value={m}>
                      {pretty(m)}
                    </option>
                  ))}
                </select>
                <input name="reference" placeholder="Transaction reference" className={`${inputClass} sm:col-span-4`} aria-label="Reference" />
                <input name="paidAt" type="date" className={`${inputClass} sm:col-span-2`} aria-label="Payment date" />
                <button
                  type="submit"
                  className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-12"
                >
                  Record payment
                </button>
              </form>
            ) : null}

            {invoice.payments.length ? (
              <ul className="divide-y divide-navy-900/5">
                {invoice.payments.map((payment) => (
                  <li key={payment.id} className="flex items-center gap-3 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm font-medium text-navy-900">{formatMoney(payment.amount)}</span>
                      <span className="block text-xs text-slate-500">
                        {pretty(payment.mode)}
                        {payment.reference ? ` · ${payment.reference}` : ""} · {payment.recordedBy?.name ?? "Team"}
                      </span>
                    </span>
                    <span className="shrink-0 text-xs text-slate-400">{formatDate(payment.paidAt)}</span>
                    {editable ? (
                      <form action={deletePayment.bind(null, payment.id)}>
                        <button
                          type="submit"
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label="Delete payment"
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </form>
                    ) : null}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">Nothing received yet.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          {editable ? (
            <Card title="Status">
              <form action={status} className="space-y-3">
                <select name="status" defaultValue={invoice.status} className={inputClass} aria-label="Invoice status">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {pretty(s)}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="w-full rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
                >
                  Update status
                </button>
              </form>
            </Card>
          ) : null}

          <Card title="Linked to">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Client</dt>
                <dd>
                  <Link href={`/admin/clients/${invoice.client.id}`} className="text-gold-700 hover:underline">
                    {invoice.client.name}
                  </Link>
                </dd>
              </div>
              {invoice.project ? (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Project</dt>
                  <dd>
                    <Link href={`/admin/client-projects/${invoice.project.id}`} className="text-gold-700 hover:underline">
                      {invoice.project.name}
                    </Link>
                  </dd>
                </div>
              ) : null}
              {invoice.quotation ? (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Quotation</dt>
                  <dd>
                    <Link href={`/admin/quotations/${invoice.quotation.id}`} className="text-gold-700 hover:underline">
                      {invoice.quotation.number}
                    </Link>
                  </dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-slate-500">Owner</dt>
                <dd className="text-navy-900">{invoice.owner?.name ?? "—"}</dd>
              </div>
            </dl>
          </Card>

          {editable ? (
            <Card title="Credit note" description="Adjust the payable amount.">
              {invoice.creditNotes.length ? (
                <ul className="mb-4 space-y-2">
                  {invoice.creditNotes.map((note) => (
                    <li key={note.id} className="rounded-lg bg-slate-50 px-3 py-2 text-sm">
                      <span className="font-medium text-navy-900">{formatMoney(note.amount)}</span>
                      <span className="block text-xs text-slate-500">
                        {note.number} · {note.reason}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              <form action={credit} className="space-y-3">
                <input name="amount" type="number" min={1} placeholder="Amount ₹" className={inputClass} aria-label="Credit amount" />
                <input name="reason" placeholder="Reason" className={inputClass} aria-label="Credit reason" />
                <button
                  type="submit"
                  className="w-full rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:bg-slate-50"
                >
                  Issue credit note
                </button>
              </form>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
