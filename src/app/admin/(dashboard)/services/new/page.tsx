import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ServiceForm } from "@/components/admin/ServiceForm";
import { PageHeader } from "@/components/admin/ui";

export default async function NewServicePage() {
  const categories = await prisma.serviceCategory.findMany({ orderBy: { order: "asc" } });

  return (
    <>
      <Link href="/admin/services" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All services
      </Link>
      <PageHeader title="New service" description="Publish a dedicated landing page for this service." />
      <ServiceForm categories={categories.map((c) => ({ id: c.id, name: c.name }))} />
    </>
  );
}
