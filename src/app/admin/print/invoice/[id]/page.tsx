import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { PrintableDocument } from "@/components/admin/PrintableDocument";
import { getSettings } from "@/lib/queries";

export default async function PrintInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("finance");
  const { id } = await params;

  const [invoice, settings] = await Promise.all([
    prisma.invoice.findUnique({
      where: { id },
      include: { client: true, items: { orderBy: { order: "asc" } }, creditNotes: true },
    }),
    getSettings(),
  ]);
  if (!invoice) notFound();

  return (
    <PrintableDocument
      doc={{
        kind: "Invoice",
        number: invoice.number,
        title: invoice.title,
        status: invoice.status,
        issuedAt: invoice.issueDate,
        dueDate: invoice.dueDate,
        dueLabel: "Due",
        items: invoice.items,
        subtotal: invoice.subtotal,
        discountPct: invoice.discountPct,
        taxPct: invoice.taxPct,
        total: invoice.total,
        paid: invoice.amountPaid,
        credited: invoice.creditNotes.reduce((sum, c) => sum + c.amount, 0),
        terms: invoice.terms,
        client: {
          name: invoice.client.name,
          address: [invoice.client.addressLine, invoice.client.city, invoice.client.state, invoice.client.postalCode]
            .filter(Boolean)
            .join(", "),
          gstin: invoice.client.gstin,
        },
        agency: {
          name: settings.siteName,
          address: [settings.addressLine, settings.city, settings.state, settings.postalCode].filter(Boolean).join(", "),
          email: settings.email,
          phone: settings.phone,
          logo: settings.logoLight,
        },
      }}
    />
  );
}
