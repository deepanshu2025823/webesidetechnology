import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { PostForm } from "@/components/admin/PostForm";
import { PageHeader } from "@/components/admin/ui";

export default async function EditPostPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [post, categories, authors] = await Promise.all([
    prisma.post.findUnique({ where: { id }, include: { tags: { include: { tag: true } } } }),
    prisma.postCategory.findMany({ orderBy: { order: "asc" }, select: { id: true, name: true } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true } }),
  ]);
  if (!post) notFound();

  const value = {
    ...JSON.parse(JSON.stringify(post)),
    // datetime-local wants `YYYY-MM-DDTHH:mm` without the timezone suffix.
    publishedAt: post.publishedAt ? post.publishedAt.toISOString().slice(0, 16) : null,
    tags: post.tags.map((t) => t.tag.name),
  };

  return (
    <>
      <Link href="/admin/posts" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All posts
      </Link>
      <PageHeader
        title={post.title}
        description={`/blog/${post.slug}`}
        actions={
          <Link
            href={`/blog/${post.slug}`}
            target="_blank"
            className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
          >
            <ExternalLink className="size-4" aria-hidden /> View live
          </Link>
        }
      />
      <PostForm post={value} categories={categories} authors={authors} />
    </>
  );
}
