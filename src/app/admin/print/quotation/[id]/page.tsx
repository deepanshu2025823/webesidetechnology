import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { PrintableDocument } from "@/components/admin/PrintableDocument";
import { agencyForPrint, clientForPrint } from "@/components/admin/print-details";
import { getSettings } from "@/lib/queries";

export default async function PrintQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("quotations");
  const { id } = await params;

  const [quotation, settings] = await Promise.all([
    prisma.quotation.findUnique({
      where: { id },
      include: {
        client: { include: { contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] } } },
        items: { orderBy: { order: "asc" } },
      },
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
        client: clientForPrint(quotation.client),
        agency: agencyForPrint(settings),
      }}
    />
  );
}
