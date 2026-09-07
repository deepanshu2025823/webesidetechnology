import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Briefcase, Pencil, Printer, Receipt } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { convertQuotationToProject, setQuotationStatus } from "@/app/admin/actions/crm";
import { convertQuotationToInvoice } from "@/app/admin/actions/finance";
import { Badge, Card, PageHeader, inputClass } from "@/components/admin/ui";
import { billingCycleLabel } from "@/lib/billing";
import { formatDate, formatMoney } from "@/lib/utils";

const TONE = {
  DRAFT: "muted",
  SENT: "neutral",
  NEGOTIATION: "warn",
  ACCEPTED: "success",
  REJECTED: "muted",
  EXPIRED: "muted",
} as const;

const STATUSES = ["DRAFT", "SENT", "NEGOTIATION", "ACCEPTED", "REJECTED", "EXPIRED"];

export default async function QuotationDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModule("quotations");
  const { id } = await params;

  const quotation = await prisma.quotation.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true, code: true, addressLine: true, city: true, state: true, gstin: true } },
      owner: { select: { name: true } },
      items: { orderBy: { order: "asc" } },
      projects: { select: { id: true, code: true, name: true } },
      invoices: { select: { id: true, number: true } },
    },
  });
  if (!quotation) notFound();

  const editable = canEdit(session.role, "quotations");
  const canMakeProject = canEdit(session.role, "projects") && quotation.projects.length === 0;
  const canInvoice = canEdit(session.role, "finance") && quotation.invoices.length === 0;

  const discount = Math.round(quotation.subtotal * (quotation.discountPct / 100));
  const taxable = quotation.subtotal - discount;
  const tax = quotation.total - taxable;

  const setStatus = setQuotationStatus.bind(null, id);
  const convert = convertQuotationToProject.bind(null, id);
  const makeInvoice = convertQuotationToInvoice.bind(null, id);
  const address = [quotation.client.addressLine, quotation.client.city, quotation.client.state]
    .filter(Boolean)
    .join(", ");

  return (
    <>
      <Link href="/admin/quotations" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All quotations
      </Link>

      <PageHeader
        title={quotation.title}
        description={`${quotation.number} · ${quotation.client.name}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href={`/admin/print/quotation/${quotation.id}`}
              target="_blank"
              className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
            >
              <Printer className="size-4" aria-hidden /> Print / PDF
            </Link>
            {editable ? (
              <Link
                href={`/admin/quotations/${quotation.id}/edit`}
                className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
              >
                <Pencil className="size-4" aria-hidden /> Edit
              </Link>
            ) : null}
            {canMakeProject ? (
              <form action={convert}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
                >
                  <Briefcase className="size-4" aria-hidden /> Convert to project
                </button>
              </form>
            ) : null}
            {canInvoice ? (
              <form action={makeInvoice}>
                <button
                  type="submit"
                  className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
                >
                  <Receipt className="size-4" aria-hidden /> Raise invoice
                </button>
              </form>
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
                <p className="mt-1 font-medium text-navy-900">{quotation.client.name}</p>
                {address ? <p className="text-sm text-slate-600">{address}</p> : null}
                {quotation.client.gstin ? (
                  <p className="text-xs text-slate-500">GSTIN {quotation.client.gstin}</p>
                ) : null}
              </div>
              <div className="text-right">
                <p className="font-display text-lg text-navy-900">{quotation.number}</p>
                <Badge tone={TONE[quotation.status]}>{quotation.status.toLowerCase()}</Badge>
                {quotation.validUntil ? (
                  <p className="mt-2 text-xs text-slate-500">Valid until {formatDate(quotation.validUntil)}</p>
                ) : null}
              </div>
            </div>

            <table className="w-full text-left text-sm">
              <thead className="text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="pb-3 font-medium">Item</th>
                  <th className="pb-3 font-medium">Duration</th>
                  <th className="pb-3 text-center font-medium">Qty</th>
                  <th className="pb-3 text-right font-medium">Rate</th>
                  <th className="pb-3 text-right font-medium">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {quotation.items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-3 pr-4">
                      <span className="font-medium text-navy-900">{item.title}</span>
                      {item.description ? (
                        <span className="mt-0.5 block text-xs text-slate-500">{item.description}</span>
                      ) : null}
                    </td>
                    <td className="py-3 pr-4 text-xs text-slate-600">{billingCycleLabel(item.billingCycle)}</td>
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
                <dd className="text-navy-900">{formatMoney(quotation.subtotal)}</dd>
              </div>
              {discount ? (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Discount ({quotation.discountPct}%)</dt>
                  <dd className="text-navy-900">− {formatMoney(discount)}</dd>
                </div>
              ) : null}
              <div className="flex justify-between">
                <dt className="text-slate-500">Tax ({quotation.taxPct}%)</dt>
                <dd className="text-navy-900">{formatMoney(tax)}</dd>
              </div>
              <div className="flex justify-between border-t border-navy-900/10 pt-3">
                <dt className="font-semibold text-navy-900">Total</dt>
                <dd className="font-display text-2xl text-navy-900">{formatMoney(quotation.total)}</dd>
              </div>
            </dl>

            {quotation.terms ? (
              <div className="mt-6 border-t border-navy-900/10 pt-5">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Terms</p>
                <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{quotation.terms}</p>
              </div>
            ) : null}
          </Card>
        </div>

        <div className="space-y-6">
          {editable ? (
            <Card title="Status">
              <form action={setStatus} className="space-y-3">
                <select name="status" defaultValue={quotation.status} className={inputClass} aria-label="Quotation status">
                  {STATUSES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0) + s.slice(1).toLowerCase()}
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

          <Card title="Details">
            <dl className="space-y-3 text-sm">
              <div className="flex justify-between">
                <dt className="text-slate-500">Owner</dt>
                <dd className="text-navy-900">{quotation.owner?.name ?? "—"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Model</dt>
                <dd className="text-navy-900">{quotation.commercial.toLowerCase().replace(/_/g, " ")}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-slate-500">Created</dt>
                <dd className="text-navy-900">{formatDate(quotation.createdAt)}</dd>
              </div>
              {quotation.sentAt ? (
                <div className="flex justify-between">
                  <dt className="text-slate-500">Sent</dt>
                  <dd className="text-navy-900">{formatDate(quotation.sentAt)}</dd>
                </div>
              ) : null}
            </dl>
          </Card>

          {quotation.projects.length ? (
            <Card title="Project">
              {quotation.projects.map((p) => (
                <Link
                  key={p.id}
                  href={`/admin/client-projects/${p.id}`}
                  className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                >
                  <span className="block font-medium text-navy-900">{p.name}</span>
                  <span className="block text-xs text-slate-500">{p.code}</span>
                </Link>
              ))}
            </Card>
          ) : null}

          {quotation.notes ? (
            <Card title="Internal notes">
              <p className="whitespace-pre-wrap text-sm text-slate-600">{quotation.notes}</p>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
