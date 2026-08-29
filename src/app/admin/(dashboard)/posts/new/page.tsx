import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PostForm } from "@/components/admin/PostForm";
import { PageHeader } from "@/components/admin/ui";

export default async function NewPostPage() {
  const [categories, authors] = await Promise.all([
    prisma.postCategory.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <Link href="/admin/posts" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All posts
      </Link>
      <PageHeader title="New post" />
      <PostForm categories={categories} authors={authors} />
    </>
  );
}
