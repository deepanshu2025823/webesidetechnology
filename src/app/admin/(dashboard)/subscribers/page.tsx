import { prisma } from "@/lib/prisma";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

export default async function SubscribersPage() {
  const subscribers = await prisma.subscriber.findMany({ orderBy: { createdAt: "desc" }, take: 500 });

  const csvHref = `data:text/csv;charset=utf-8,${encodeURIComponent(
    ["email,name,source,subscribed", ...subscribers.map((s) => `${s.email},${s.name},${s.source},${s.createdAt.toISOString()}`)].join("\n"),
  )}`;

  return (
    <>
      <PageHeader
        title="Newsletter subscribers"
        description="Everyone who signed up through the footer form."
        actions={
          subscribers.length ? (
            <a
              href={csvHref}
              download="webeside-subscribers.csv"
              className="rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 transition-colors hover:border-gold-500 hover:bg-gold-50"
            >
              Export CSV
            </a>
          ) : null
        }
      />

      {subscribers.length === 0 ? (
        <EmptyState title="No subscribers yet" description="Sign-ups from the footer form will land here." />
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
