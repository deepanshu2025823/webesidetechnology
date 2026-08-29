import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { PageHeader } from "@/components/admin/ui";

export default async function EditProjectPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [project, services] = await Promise.all([
    prisma.project.findUnique({ where: { id }, include: { services: true } }),
    prisma.service.findMany({ orderBy: { order: "asc" }, select: { id: true, title: true } }),
  ]);
  if (!project) notFound();

  const value = {
    ...JSON.parse(JSON.stringify(project)),
    // <input type="date"> needs a bare YYYY-MM-DD value.
    completedAt: project.completedAt ? project.completedAt.toISOString().slice(0, 10) : null,
    serviceIds: project.services.map((s) => s.serviceId),
  };

  return (
    <>
      <Link href="/admin/projects" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All case studies
      </Link>
      <PageHeader
        title={project.title}
        description={`/portfolio/${project.slug}`}
        actions={
          <Link
            href={`/portfolio/${project.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
          >
            <ExternalLink className="size-4" aria-hidden /> View live
          </Link>
        }
      />
      <ProjectForm project={value} services={services} />
    </>
  );
}
