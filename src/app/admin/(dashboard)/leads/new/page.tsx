import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { LeadForm } from "@/components/admin/LeadForm";
import { PageHeader } from "@/components/admin/ui";

export default async function NewLeadPage() {
  await requirePermission("leads", "write");

  const [owners, services] = await Promise.all([
    prisma.user.findMany({
      where: { isActive: true },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
    // Suggests the real catalogue rather than free text nobody can report on.
    prisma.service.findMany({ where: { status: "PUBLISHED" }, select: { title: true }, orderBy: { order: "asc" } }),
  ]);

  return (
    <>
      <Link href="/admin/leads" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All leads
      </Link>
      <PageHeader
        title="New lead"
        description="For enquiries that arrive by phone, WhatsApp or in person — anything the website form did not capture."
      />
      <LeadForm owners={owners} services={services.map((s) => s.title)} />
    </>
  );
}
