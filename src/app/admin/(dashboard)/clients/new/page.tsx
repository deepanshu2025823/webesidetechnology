import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { ClientForm } from "@/components/admin/ClientForm";
import { PageHeader } from "@/components/admin/ui";
import { industryOptions } from "@/lib/admin/industries";

export default async function NewClientPage() {
  await requirePermission("clients", "write");
  const [owners, used] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    prisma.client.findMany({ where: { industry: { not: "" } }, select: { industry: true }, distinct: ["industry"] }),
  ]);

  return (
    <>
      <Link href="/admin/clients" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All clients
      </Link>
      <PageHeader title="New client" description="A company record that projects, quotations and invoices hang off." />
      <ClientForm owners={owners} industries={industryOptions(used.map((c) => c.industry))} />
    </>
  );
}
