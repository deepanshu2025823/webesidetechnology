import { prisma } from "@/lib/prisma";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { DataTools } from "@/components/admin/DataTools";
import { formatDate } from "@/lib/utils";

export default async function SubscribersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; from?: string; to?: string }>;
}) {
  const { q, from, to } = await searchParams;
  const term = q?.trim();
  const end = to ? new Date(to) : undefined;
  if (end) end.setHours(23, 59, 59, 999);

  const subscribers = await prisma.subscriber.findMany({
    where: {
      ...(term
        ? { OR: [{ email: { contains: term } }, { name: { contains: term } }, { source: { contains: term } }] }
        : {}),
      ...(from || end
        ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(end ? { lte: end } : {}) } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 500,
  });

  return (
    <>
      <PageHeader
        title="Newsletter subscribers"
        description="Everyone who signed up through the footer form."
      />

      {/* Export, import and search all come from the shared toolbar. */}
      <DataTools dataset="subscribers" />

      {subscribers.length === 0 ? (
        <EmptyState
          title={term ? `Nothing matches “${term}”` : "No subscribers yet"}
          description={term ? "Try a shorter search." : "Sign-ups from the footer form will land here."}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Email</th>
                <th className="px-5 py-3 font-medium">Source</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Joined</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-900/5">
              {subscribers.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5 font-medium text-navy-900">{s.email}</td>
                  <td className="px-5 py-3.5 text-slate-600">{s.source}</td>
                  <td className="px-5 py-3.5">
                    {s.isActive ? <Badge tone="success">Active</Badge> : <Badge tone="muted">Unsubscribed</Badge>}
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">{formatDate(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
