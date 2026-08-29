import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { PageForm } from "@/components/admin/PageForm";
import { PageHeader } from "@/components/admin/ui";

export default function NewPagePage() {
  return (
    <>
      <Link href="/admin/pages" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All pages
      </Link>
      <PageHeader title="New page" />
      <PageForm />
    </>
  );
}
