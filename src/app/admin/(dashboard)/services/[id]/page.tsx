import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ServiceForm } from "@/components/admin/ServiceForm";
import { PageHeader } from "@/components/admin/ui";

export default async function EditServicePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [service, categories] = await Promise.all([
    prisma.service.findUnique({ where: { id } }),
    prisma.serviceCategory.findMany({ orderBy: { order: "asc" } }),
  ]);
  if (!service) notFound();

  return (
    <>
      <Link href="/admin/services" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All services
      </Link>
      <PageHeader
        title={service.title}
        description={`/services/${service.slug}`}
        actions={
          <Link
            href={`/services/${service.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
          >
            <ExternalLink className="size-4" aria-hidden /> View live
          </Link>
        }
      />
      <ServiceForm
        service={JSON.parse(JSON.stringify(service))}
        categories={categories.map((c) => ({ id: c.id, name: c.name }))}
      />
    </>
  );
}
