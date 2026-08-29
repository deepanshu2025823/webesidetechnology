import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { ClientProjectForm } from "@/components/admin/ClientProjectForm";
import { PageHeader } from "@/components/admin/ui";

export default async function EditClientProjectPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("projects", "write");
  const { id } = await params;

  const [project, clients, services, managers] = await Promise.all([
    prisma.clientProject.findUnique({ where: { id } }),
    prisma.client.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ select: { id: true, title: true }, orderBy: { order: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!project) notFound();

  const value = {
    ...project,
    startDate: project.startDate ? project.startDate.toISOString().slice(0, 10) : null,
    endDate: project.endDate ? project.endDate.toISOString().slice(0, 10) : null,
  };

  return (
    <>
      <Link
        href={`/admin/client-projects/${project.id}`}
        className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to {project.name}
      </Link>
      <PageHeader title={`Edit ${project.name}`} description={`${project.code} · scope version ${project.scopeVersion}`} />
      <ClientProjectForm project={value} clients={clients} services={services} managers={managers} />
    </>
  );
}
