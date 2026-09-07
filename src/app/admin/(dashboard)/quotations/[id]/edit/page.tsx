import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { QuotationForm } from "@/components/admin/QuotationForm";
import { PageHeader } from "@/components/admin/ui";

export default async function EditQuotationPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("quotations", "write");
  const { id } = await params;

  const [quotation, clients, services, owners] = await Promise.all([
    prisma.quotation.findUnique({ where: { id }, include: { items: { orderBy: { order: "asc" } } } }),
    prisma.client.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ select: { id: true, title: true, priceFrom: true }, orderBy: { order: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }),
  ]);
  if (!quotation) notFound();

  const value = {
    id: quotation.id,
    title: quotation.title,
    clientId: quotation.clientId,
    leadId: quotation.leadId,
    status: quotation.status,
    commercial: quotation.commercial,
    validUntil: quotation.validUntil ? quotation.validUntil.toISOString().slice(0, 10) : null,
    discountPct: quotation.discountPct,
    taxPct: quotation.taxPct,
    terms: quotation.terms,
    notes: quotation.notes,
    ownerId: quotation.ownerId,
    items: quotation.items.map((i) => ({
      serviceId: i.serviceId ?? "",
      title: i.title,
      description: i.description ?? "",
      quantity: String(i.quantity),
      unitPrice: String(i.unitPrice),
      billingCycle: i.billingCycle,
    })),
  };

  return (
    <>
      <Link
        href={`/admin/quotations/${quotation.id}`}
        className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to {quotation.number}
      </Link>
      <PageHeader title={`Edit ${quotation.number}`} description={quotation.title} />
      <QuotationForm quotation={value} clients={clients} services={services} owners={owners} />
    </>
  );
}
