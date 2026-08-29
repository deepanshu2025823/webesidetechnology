import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PageForm } from "@/components/admin/PageForm";
import { PageHeader } from "@/components/admin/ui";

export default async function EditPagePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const page = await prisma.page.findUnique({ where: { id } });
  if (!page) notFound();

  const href = page.slug === "about" ? "/about" : `/${page.slug}`;

  return (
    <>
      <Link href="/admin/pages" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All pages
      </Link>
      <PageHeader
        title={page.title}
        description={href}
        actions={
          <Link
            href={href}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
          >
            <ExternalLink className="size-4" aria-hidden /> View live
          </Link>
        }
      />
      <PageForm page={JSON.parse(JSON.stringify(page))} />
    </>
  );
}
