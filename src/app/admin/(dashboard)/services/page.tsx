import Link from "next/link";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deleteService } from "@/app/admin/actions/content";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { DeleteRowButton } from "@/components/admin/DeleteRowButton";
import { DataTools } from "@/components/admin/DataTools";
import { Icon } from "@/components/ui/Icon";

export default async function ServicesAdminPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string }>;
}) {
  const { q, status } = await searchParams;
  const term = q?.trim();

  const services = await prisma.service.findMany({
    where: {
      ...(status && status !== "ALL" ? { status: status as never } : {}),
      ...(term
        ? {
            OR: [
              { title: { contains: term } },
              { shortDescription: { contains: term } },
              { slug: { contains: term } },
            ],
          }
        : {}),
    },
    orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    include: { category: true },
  });

  return (
    <>
      <PageHeader
        title="Services"
        description="Each service gets its own SEO-optimised landing page."
        actions={
          <Link
            href="/admin/services/new"
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
          >
            <Plus className="size-4" aria-hidden /> Add service
          </Link>
        }
      />

      <DataTools dataset="services" showDateRange={false} />

      {services.length === 0 ? (
        <EmptyState
          title={term ? `Nothing matches “${term}”` : "No services yet"}
          description={
            term
              ? "Try a shorter search, or clear the filters above."
              : "Add your first service to populate the services page and the home page grid."
          }
          action={
            term ? null : (
              <Link href="/admin/services/new" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white">
                Add a service
              </Link>
            )
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Service</th>
                  <th className="px-5 py-3 font-medium">Group</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Home</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {services.map((service) => (
                  <tr key={service.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy-900 text-gold-400">
                          <Icon name={service.icon} className="size-4" />
                        </span>
                        <div className="min-w-0">
                          <Link href={`/admin/services/${service.id}`} className="font-medium text-navy-900 hover:text-gold-700">
                            {service.title}
                          </Link>
                          <p className="truncate text-xs text-slate-500">/services/{service.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{service.category?.name ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={service.status === "PUBLISHED" ? "success" : "muted"}>
                        {service.status.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      {service.isFeatured ? <Badge tone="neutral">Featured</Badge> : <span className="text-slate-400">—</span>}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex gap-1">
                        <Link
                          href={`/services/${service.slug}`}
                          target="_blank"
                          className="rounded-lg p-2 text-slate-500 hover:bg-navy-50 hover:text-navy-900"
                          aria-label="View live"
                        >
                          <ExternalLink className="size-4" />
                        </Link>
                        <Link
                          href={`/admin/services/${service.id}`}
                          className="rounded-lg p-2 text-slate-500 hover:bg-navy-50 hover:text-navy-900"
                          aria-label="Edit"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <DeleteRowButton
                          label={service.title}
                          action={async () => {
                            "use server";
                            await deleteService(service.id);
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
