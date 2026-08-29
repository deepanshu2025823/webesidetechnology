import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { InvoiceForm } from "@/components/admin/InvoiceForm";
import { PageHeader } from "@/components/admin/ui";

export default async function NewInvoicePage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  await requirePermission("finance", "write");
  const { clientId } = await searchParams;

  const [clients, projects, services, owners] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.clientProject.findMany({ select: { id: true, name: true, clientId: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ select: { id: true, title: true, priceFrom: true }, orderBy: { order: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Link href="/admin/finance/invoices" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All invoices
      </Link>
      <PageHeader title="New invoice" />
      <InvoiceForm clients={clients} projects={projects} services={services} owners={owners} defaultClientId={clientId} />
    </>
  );
}
