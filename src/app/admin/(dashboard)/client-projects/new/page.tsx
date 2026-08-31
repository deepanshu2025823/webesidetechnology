import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { ClientProjectForm } from "@/components/admin/ClientProjectForm";
import { PageHeader } from "@/components/admin/ui";

export default async function NewClientProjectPage({
  searchParams,
}: {
  searchParams: Promise<{ clientId?: string }>;
}) {
  await requirePermission("projects", "write");
  const { clientId } = await searchParams;

  const [clients, services, managers] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true, code: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ select: { id: true, title: true }, orderBy: { order: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }),
  ]);

  return (
    <>
      <Link
        href="/admin/client-projects"
        className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900"
      >
        <ArrowLeft className="size-4" aria-hidden /> All projects
      </Link>
      <PageHeader title="New project" description="Write the scope down first — it becomes the baseline everything is measured against." />
      <ClientProjectForm clients={clients} services={services} managers={managers} defaultClientId={clientId} />
    </>
  );
}
