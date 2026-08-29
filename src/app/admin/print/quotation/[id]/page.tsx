import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { PrintableDocument } from "@/components/admin/PrintableDocument";
import { getSettings } from "@/lib/queries";

export default async function PrintQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("quotations");
  const { id } = await params;

  const [quotation, settings] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id },
      include: { client: true, items: { orderBy: { order: "asc" } } },
    }),
    getSettings(),
  ]);
  if (!quotation) notFound();

  return (
    <PrintableDocument
      doc={{
        kind: "Quotation",
        number: quotation.number,
        title: quotation.title,
        status: quotation.status,
        issuedAt: quotation.createdAt,
        dueDate: quotation.validUntil,
        dueLabel: "Valid until",
        items: quotation.items,
        subtotal: quotation.subtotal,
        discountPct: quotation.discountPct,
        taxPct: quotation.taxPct,
        total: quotation.total,
        terms: quotation.terms,
        client: {
          name: quotation.client.name,
          address: [quotation.client.addressLine, quotation.client.city, quotation.client.state, quotation.client.postalCode]
            .filter(Boolean)
            .join(", "),
          gstin: quotation.client.gstin,
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
