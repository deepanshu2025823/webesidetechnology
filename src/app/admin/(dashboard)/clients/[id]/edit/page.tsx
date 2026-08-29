import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { ClientForm } from "@/components/admin/ClientForm";
import { PageHeader } from "@/components/admin/ui";

export default async function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  await requirePermission("clients", "write");
  const { id } = await params;

  const [client, owners] = await Promise.all([
    prisma.client.findUnique({ where: { id } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);
  if (!client) notFound();

  return (
    <>
      <Link
        href={`/admin/clients/${client.id}`}
        className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900"
      >
        <ArrowLeft className="size-4" aria-hidden /> Back to {client.name}
      </Link>
      <PageHeader title={`Edit ${client.name}`} description={client.code} />
      <ClientForm client={JSON.parse(JSON.stringify(client))} owners={owners} />
    </>
  );
}
