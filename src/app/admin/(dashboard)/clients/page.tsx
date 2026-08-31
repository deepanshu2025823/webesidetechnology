import Link from "next/link";
import { Building2, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { DataTools } from "@/components/admin/DataTools";
import { formatDate } from "@/lib/utils";

const STATUS_TONE = { PROSPECT: "warn", ACTIVE: "success", ON_HOLD: "neutral", CHURNED: "muted" } as const;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string }>;
}) {
  const session = await requireModule("clients");
  const { status, q, from, to } = await searchParams;

  const term = q?.trim();
  const end = to ? new Date(to) : undefined;
  if (end) end.setHours(23, 59, 59, 999);

  const clients = await prisma.client.findMany({
    where: {
      ...(status && status !== "ALL" ? { status: status as never } : {}),
      ...(term
        ? {
            OR: [
              { name: { contains: term } },
              { code: { contains: term } },
              { industry: { contains: term } },
              { city: { contains: term } },
              { gstin: { contains: term } },
              { website: { contains: term } },
              { contacts: { some: { OR: [{ name: { contains: term } }, { email: { contains: term } }] } } },
            ],
          }
        : {}),
      ...(from || end
        ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(end ? { lte: end } : {}) } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: {
      owner: { select: { name: true } },
      contacts: { where: { isPrimary: true }, take: 1 },
      _count: { select: { projects: true, quotations: true } },
    },
  });

  const editable = canEdit(session.role, "clients");

  return (
    <>
      <PageHeader
        title="Clients"
        description="Every company you work with, their contacts and their history."
        actions={
          editable ? (
            <Link
              href="/admin/clients/new"
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              <Plus className="size-4" aria-hidden /> Add client
            </Link>
          ) : null
        }
      />

      <DataTools dataset="clients" />

      {clients.length === 0 ? (
        <EmptyState
          title={term ? `Nothing matches “${term}”` : "No clients yet"}
          description={
            term
              ? "Try a shorter search, or clear the filters above."
              : "Add a client directly, or convert a qualified lead from the Leads page."
          }
          action={
            editable ? (
              <Link href="/admin/clients/new" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white">
                Add the first client
              </Link>
            ) : null
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Primary contact</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Work</th>
                  <th className="px-5 py-3 font-medium">Added</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {clients.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/clients/${client.id}`} className="flex items-center gap-3">
                        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-navy-900 text-gold-400">
                          <Building2 className="size-4" aria-hidden />
                        </span>
                        <span>
                          <span className="block font-medium text-navy-900 hover:text-gold-700">{client.name}</span>
                          <span className="block text-xs text-slate-500">
                            {client.code}
                            {client.industry ? ` · ${client.industry}` : ""}
                          </span>
                        </span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">
                      {client.contacts[0] ? (
                        <>
                          <span className="block">{client.contacts[0].name}</span>
                          <span className="block text-xs text-slate-500">{client.contacts[0].email}</span>
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{client.owner?.name ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={STATUS_TONE[client.status]}>
                        {client.status === "ON_HOLD" ? "on hold" : client.status.toLowerCase()}
                      </Badge>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {client._count.projects} project{client._count.projects === 1 ? "" : "s"} ·{" "}
                      {client._count.quotations} quote{client._count.quotations === 1 ? "" : "s"}
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">{formatDate(client.createdAt)}</td>
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
