import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { QuotationForm } from "@/components/admin/QuotationForm";
import { PageHeader } from "@/components/admin/ui";

export default async function NewQuotationPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  await requirePermission("quotations", "write");
  const { clientId } = await searchParams;

  const [clients, services, owners] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ select: { id: true, title: true, priceFrom: true }, orderBy: { order: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Link href="/admin/quotations" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All quotations
      </Link>
      <PageHeader title="New quotation" description="Pick services, set the price, then convert it into a project when it's accepted." />
      <QuotationForm clients={clients} services={services} owners={owners} defaultClientId={clientId} />
    </>
  );
}
