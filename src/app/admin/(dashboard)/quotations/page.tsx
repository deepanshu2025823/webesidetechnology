import Link from "next/link";
import { Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { DataTools } from "@/components/admin/DataTools";
import { cn, formatDate, formatMoney } from "@/lib/utils";

const TONE = {
  DRAFT: "muted",
  SENT: "neutral",
  NEGOTIATION: "warn",
  ACCEPTED: "success",
  REJECTED: "muted",
  EXPIRED: "muted",
} as const;

const STAGES = ["ALL", "DRAFT", "SENT", "NEGOTIATION", "ACCEPTED", "REJECTED", "EXPIRED"];

export default async function QuotationsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; q?: string; from?: string; to?: string }>;
}) {
  const session = await requireModule("quotations");
  const { status, q, from, to } = await searchParams;

  const term = q?.trim();
  const end = to ? new Date(to) : undefined;
  if (end) end.setHours(23, 59, 59, 999);

  const quotations = await prisma.quotation.findMany({
    where: {
      ...(status && status !== "ALL" ? { status: status as never } : {}),
      ...(term
        ? {
            OR: [
              { number: { contains: term } },
              { title: { contains: term } },
              { client: { name: { contains: term } } },
            ],
          }
        : {}),
      ...(from || end
        ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(end ? { lte: end } : {}) } }
        : {}),
    },
    orderBy: { createdAt: "desc" },
    include: { client: { select: { id: true, name: true } }, owner: { select: { name: true } } },
  });

  const pipelineValue = quotations
    .filter((q) => ["SENT", "NEGOTIATION"].includes(q.status))
    .reduce((sum, q) => sum + q.total, 0);
  const editable = canEdit(session.role, "quotations");

  /** Stage links keep whatever search and dates are already applied. */
  const stageHref = (next: string) => {
    const params = new URLSearchParams();
    if (next !== "ALL") params.set("status", next);
    for (const [key, value] of Object.entries({ q, from, to })) if (value) params.set(key, value);
    return params.size ? `/admin/quotations?${params}` : "/admin/quotations";
  };

  return (
    <>
      <PageHeader
        title="Quotations"
        description={
          pipelineValue
            ? `${formatMoney(pipelineValue)} sitting in sent and negotiating quotes.`
            : "Service-wise quotations that convert straight into projects."
        }
        actions={
          editable ? (
            <Link
              href="/admin/quotations/new"
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              <Plus className="size-4" aria-hidden /> New quotation
            </Link>
          ) : null
        }
      />

      {/* Stage chips below already filter by status. */}
      <DataTools dataset="quotations" statuses={false} />

      <nav className="mb-5 flex flex-wrap gap-2">
        {STAGES.map((s) => (
          <Link
            key={s}
            href={stageHref(s)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              (status ?? "ALL") === s
                ? "bg-navy-900 text-white"
                : "border border-navy-900/15 text-navy-700 hover:border-gold-500 hover:bg-gold-50",
            )}
          >
            {s.charAt(0) + s.slice(1).toLowerCase()}
          </Link>
        ))}
      </nav>

      {quotations.length === 0 ? (
        <EmptyState
          title="No quotations yet"
          description="Build one from a client record, or start from scratch."
          action={
            editable ? (
              <Link href="/admin/quotations/new" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white">
                Create a quotation
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
                  <th className="px-5 py-3 font-medium">Quotation</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 text-right font-medium">Value</th>
                  <th className="px-5 py-3 font-medium">Valid until</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {quotations.map((q) => (
                  <tr key={q.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/quotations/${q.id}`} className="block">
                        <span className="block font-medium text-navy-900 hover:text-gold-700">{q.title}</span>
                        <span className="block text-xs text-slate-500">{q.number}</span>
                      </Link>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link href={`/admin/clients/${q.client.id}`} className="text-slate-600 hover:text-gold-700">
                        {q.client.name}
                      </Link>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{q.owner?.name ?? "—"}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={TONE[q.status]}>{q.status.toLowerCase()}</Badge>
                    </td>
                    <td className="px-5 py-3.5 text-right font-medium text-navy-900">{formatMoney(q.total)}</td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {q.validUntil ? formatDate(q.validUntil) : "—"}
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
