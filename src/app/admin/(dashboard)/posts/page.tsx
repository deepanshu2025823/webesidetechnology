import Link from "next/link";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deletePost } from "@/app/admin/actions/content";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { DeleteRowButton } from "@/components/admin/DeleteRowButton";
import { formatDate } from "@/lib/utils";

export default async function PostsAdminPage() {
  const posts = await prisma.post.findMany({
    orderBy: [{ publishedAt: "desc" }, { createdAt: "desc" }],
    include: { category: true, author: true },
  });

  return (
    <>
      <PageHeader
        title="Blog posts"
        description="Articles published to /blog. Drafts stay hidden from the public site."
        actions={
          <Link
            href="/admin/posts/new"
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Plus className="size-4" aria-hidden /> Write a post
          </Link>
        }
      />

      {posts.length === 0 ? (
        <EmptyState
          title="No posts yet"
          description="Publishing regularly is the cheapest way to grow organic traffic."
          action={
            <Link href="/admin/posts/new" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white">
              Write the first post
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Title</th>
                  <th className="px-5 py-3 font-medium">Category</th>
                  <th className="px-5 py-3 font-medium">Author</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Published</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {posts.map((post) => (
                  <tr key={post.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/posts/${post.id}`} className="font-medium text-navy-900 hover:text-gold-700">
                        {post.title}
                      </Link>
                      <p className="truncate text-xs text-slate-500">/blog/{post.slug}</p>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{post.category?.name ?? "—"}</td>
                    <td className="px-5 py-3.5 text-slate-600">{post.author?.name ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={post.status === "PUBLISHED" ? "success" : post.status === "DRAFT" ? "warn" : "muted"}>
                        {post.status.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {post.publishedAt ? formatDate(post.publishedAt) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex gap-1">
                        <Link
                          href={`/blog/${post.slug}`}
                          target="_blank"
                          className="rounded-lg p-2 text-slate-500 hover:bg-navy-50 hover:text-navy-900"
                          aria-label="View live"
                        >
                          <ExternalLink className="size-4" />
                        </Link>
                        <Link
                          href={`/admin/posts/${post.id}`}
                          className="rounded-lg p-2 text-slate-500 hover:bg-navy-50 hover:text-navy-900"
                          aria-label="Edit"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <DeleteRowButton
                          label={post.title}
                          action={async () => {
                            "use server";
                            await deletePost(post.id);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
