import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { ProjectForm } from "@/components/admin/ProjectForm";
import { PageHeader } from "@/components/admin/ui";

export default async function NewProjectPage() {
  const services = await prisma.service.findMany({ orderBy: { order: "asc" }, select: { id: true, title: true } });

  return (
    <>
      <Link href="/admin/projects" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All case studies
      </Link>
      <PageHeader title="New case study" description="Tell the story: the brief, the build and the outcome." />
      <ProjectForm services={services} />
    </>
  );
}
