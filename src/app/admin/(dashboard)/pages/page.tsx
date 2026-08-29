import Link from "next/link";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deletePage } from "@/app/admin/actions/content";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { DeleteRowButton } from "@/components/admin/DeleteRowButton";
import { formatDate } from "@/lib/utils";

export default async function PagesAdminPage() {
  const pages = await prisma.page.findMany({ orderBy: { title: "asc" } });

  return (
    <>
      <PageHeader
        title="Pages"
        description="Standalone pages such as About, Privacy Policy and Terms."
        actions={
          <Link
            href="/admin/pages/new"
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Plus className="size-4" aria-hidden /> Add page
          </Link>
        }
      />

      {pages.length === 0 ? (
        <EmptyState title="No pages yet" description="Create pages such as Privacy Policy or Terms & Conditions." />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Page</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Sitemap</th>
                <th className="px-5 py-3 font-medium">Updated</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-900/5">
              {pages.map((page) => (
                <tr key={page.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5">
                    <Link href={`/admin/pages/${page.id}`} className="font-medium text-navy-900 hover:text-gold-700">
                      {page.title}
                    </Link>
                    <p className="truncate text-xs text-slate-500">/{page.slug}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <Badge tone={page.status === "PUBLISHED" ? "success" : "muted"}>{page.status.toLowerCase()}</Badge>
                  </td>
                  <td className="px-5 py-3.5">
                    {page.showInSitemap ? <Badge tone="neutral">Indexed</Badge> : <Badge tone="muted">Hidden</Badge>}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">{formatDate(page.updatedAt)}</td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex gap-1">
                      <Link
                        href={`/${page.slug}`}
                        target="_blank"
                        className="rounded-lg p-2 text-slate-500 hover:bg-navy-50 hover:text-navy-900"
                        aria-label="View live"
                      >
                        <ExternalLink className="size-4" />
                      </Link>
                      <Link
                        href={`/admin/pages/${page.id}`}
                        className="rounded-lg p-2 text-slate-500 hover:bg-navy-50 hover:text-navy-900"
                        aria-label="Edit"
                      >
                        <Pencil className="size-4" />
                      </Link>
                      {page.isSystem ? (
                        <span className="px-2 py-2 text-xs text-slate-400">system</span>
                      ) : (
                        <DeleteRowButton
                          label={page.title}
                          action={async () => {
                            "use server";
                            await deletePage(page.id);
                          }}
                        />
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
