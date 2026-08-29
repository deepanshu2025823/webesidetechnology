import Image from "next/image";
import { formatDate, formatMoney } from "@/lib/utils";

export type PrintLine = {
  id: string;
  title: string;
  description: string | null;
  quantity: number;
  unitPrice: number;
  amount: number;
};

export type PrintDocument = {
  kind: "Invoice" | "Quotation";
  number: string;
  title: string;
  status: string;
  issuedAt: Date;
  dueLabel?: string;
  dueDate?: Date | null;
  items: PrintLine[];
  subtotal: number;
  discountPct: number;
  taxPct: number;
  total: number;
  paid?: number;
  credited?: number;
  terms?: string | null;
  client: {
    name: string;
    address: string;
    gstin: string;
  };
  agency: {
    name: string;
    address: string;
    email: string;
    phone: string;
    logo: string;
  };
};

/**
 * Print-first document used for both quotations and invoices. Opening it and
 * choosing "Save as PDF" is how the client gets a PDF, which avoids shipping a
 * PDF engine and keeps the output identical to what they see on screen.
 */
export function PrintableDocument({ doc }: { doc: PrintDocument }) {
  const discount = Math.round(doc.subtotal * (doc.discountPct / 100));
  const tax = doc.total - (doc.subtotal - discount);
  const balance = doc.total - (doc.credited ?? 0) - (doc.paid ?? 0);

  return (
    <div className="mx-auto max-w-[820px] bg-white p-10 text-navy-900 print:p-0">
      <div className="mb-8 flex items-start justify-between gap-8 border-b-2 border-gold-600 pb-6">
        <div>
          <Image src={doc.agency.logo} alt={doc.agency.name} width={1024} height={390} className="h-20 w-auto" />
          <p className="mt-3 font-display text-lg">{doc.agency.name}</p>
          {doc.agency.address ? <p className="text-xs text-slate-600">{doc.agency.address}</p> : null}
          <p className="text-xs text-slate-600">
            {[doc.agency.email, doc.agency.phone].filter(Boolean).join(" · ")}
          </p>
        </div>

        <div className="text-right">
          <p className="font-display text-2xl uppercase tracking-wide text-gold-700">{doc.kind}</p>
          <p className="mt-1 text-sm font-medium">{doc.number}</p>
          <p className="mt-2 text-xs text-slate-600">Date: {formatDate(doc.issuedAt)}</p>
          {doc.dueDate ? (
            <p className="text-xs text-slate-600">
              {doc.dueLabel ?? "Due"}: {formatDate(doc.dueDate)}
            </p>
          ) : null}
          <p className="mt-2 inline-block rounded border border-navy-900/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">
            {doc.status.toLowerCase().replace(/_/g, " ")}
          </p>
        </div>
      </div>

      <div className="mb-8 grid gap-6 sm:grid-cols-2">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            {doc.kind === "Invoice" ? "Billed to" : "Prepared for"}
          </p>
          <p className="mt-1 font-medium">{doc.client.name}</p>
          {doc.client.address ? <p className="text-sm text-slate-600">{doc.client.address}</p> : null}
          {doc.client.gstin ? <p className="text-xs text-slate-500">GSTIN {doc.client.gstin}</p> : null}
        </div>
        <div className="sm:text-right">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Subject</p>
          <p className="mt-1 text-sm">{doc.title}</p>
        </div>
      </div>

      <table className="w-full border-collapse text-left text-sm">
        <thead>
          <tr className="bg-navy-900 text-white">
            <th className="px-3 py-2 font-medium">#</th>
            <th className="px-3 py-2 font-medium">Description</th>
            <th className="px-3 py-2 text-center font-medium">Qty</th>
            <th className="px-3 py-2 text-right font-medium">Rate</th>
            <th className="px-3 py-2 text-right font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {doc.items.map((item, index) => (
            <tr key={item.id} className="border-b border-navy-900/10">
              <td className="px-3 py-2.5 text-slate-500">{index + 1}</td>
              <td className="px-3 py-2.5">
                <span className="font-medium">{item.title}</span>
                {item.description ? <span className="mt-0.5 block text-xs text-slate-500">{item.description}</span> : null}
              </td>
              <td className="px-3 py-2.5 text-center text-slate-600">{item.quantity}</td>
              <td className="px-3 py-2.5 text-right text-slate-600">{formatMoney(item.unitPrice)}</td>
              <td className="px-3 py-2.5 text-right font-medium">{formatMoney(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-6 flex justify-end">
        <dl className="w-full max-w-xs space-y-1.5 text-sm">
          <div className="flex justify-between">
            <dt className="text-slate-500">Subtotal</dt>
            <dd>{formatMoney(doc.subtotal)}</dd>
          </div>
          {discount ? (
            <div className="flex justify-between">
              <dt className="text-slate-500">Discount ({doc.discountPct}%)</dt>
              <dd>− {formatMoney(discount)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt className="text-slate-500">GST ({doc.taxPct}%)</dt>
            <dd>{formatMoney(tax)}</dd>
          </div>
          <div className="flex justify-between border-t-2 border-gold-600 pt-2 text-base font-semibold">
            <dt>Total</dt>
            <dd>{formatMoney(doc.total)}</dd>
          </div>
          {doc.credited ? (
            <div className="flex justify-between">
              <dt className="text-slate-500">Credit notes</dt>
              <dd>− {formatMoney(doc.credited)}</dd>
            </div>
          ) : null}
          {doc.paid !== undefined ? (
            <>
              <div className="flex justify-between">
                <dt className="text-slate-500">Paid</dt>
                <dd>{formatMoney(doc.paid)}</dd>
              </div>
              <div className="flex justify-between border-t border-navy-900/15 pt-2 font-semibold">
                <dt>Balance due</dt>
                <dd>{formatMoney(Math.max(0, balance))}</dd>
              </div>
            </>
          ) : null}
        </dl>
      </div>

      {doc.terms ? (
        <div className="mt-10 border-t border-navy-900/10 pt-5">
          <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Terms & conditions</p>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-slate-600">{doc.terms}</p>
        </div>
      ) : null}

      <p className="mt-12 text-center text-[10px] text-slate-400">
        {doc.agency.name} · This is a computer-generated document.
      </p>
    </div>
  );
}
