import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { InvoiceForm } from "@/components/admin/InvoiceForm";
import { PageHeader } from "@/components/admin/ui";

export default async function EditInvoicePage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("finance", "write");
  const { id } = await params;

  const [invoice, clients, projects, services, owners] = await Promise.all([
    prisma.invoice.findUnique({ where: { id }, include: { items: { orderBy: { order: "asc" } } } }),
    prisma.client.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.clientProject.findMany({ select: { id: true, name: true, clientId: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ select: { id: true, title: true, priceFrom: true }, orderBy: { order: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }),
  ]);
  if (!invoice) notFound();

  const value = {
    id: invoice.id,
    title: invoice.title,
    clientId: invoice.clientId,
    projectId: invoice.projectId,
    kind: invoice.kind,
    status: invoice.status,
    issueDate: invoice.issueDate.toISOString().slice(0, 10),
    dueDate: invoice.dueDate ? invoice.dueDate.toISOString().slice(0, 10) : null,
    discountPct: invoice.discountPct,
    taxPct: invoice.taxPct,
    terms: invoice.terms,
    notes: invoice.notes,
    ownerId: invoice.ownerId,
    items: invoice.items.map((i) => ({
      serviceId: i.serviceId ?? "",
      title: i.title,
      description: i.description ?? "",
      quantity: String(i.quantity),
      unitPrice: String(i.unitPrice),
    })),
  };

  return (
    <>
      <Link
        href={`/admin/finance/invoices/${invoice.id}`}
        className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to {invoice.number}
      </Link>
      <PageHeader title={`Edit ${invoice.number}`} description={invoice.title} />
      <InvoiceForm invoice={value} clients={clients} projects={projects} services={services} owners={owners} />
    </>
  );
}
