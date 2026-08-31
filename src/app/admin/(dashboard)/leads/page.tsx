import Link from "next/link";
import { CircleDot, Flame, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { DataTools } from "@/components/admin/DataTools";
import { cn, formatDate } from "@/lib/utils";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"] as const;

const TONE = {
  NEW: "warn",
  CONTACTED: "neutral",
  QUALIFIED: "neutral",
  PROPOSAL: "neutral",
  WON: "success",
  LOST: "muted",
} as const;

type Query = { status?: string; owner?: string; q?: string; from?: string; to?: string };

export default async function LeadsPage({ searchParams }: { searchParams: Promise<Query> }) {
  const session = await requireModule("leads");
  const { status, owner, q, from, to } = await searchParams;

  const term = q?.trim();
  // Matched against every field a colleague would think to search by.
  const textWhere = term
    ? {
        OR: [
          { name: { contains: term } },
          { email: { contains: term } },
          { phone: { contains: term } },
          { company: { contains: term } },
          { serviceInterest: { contains: term } },
          { message: { contains: term } },
        ],
      }
    : {};

  const end = to ? new Date(to) : undefined;
  if (end) end.setHours(23, 59, 59, 999);
  const dateWhere =
    from || end ? { createdAt: { ...(from ? { gte: new Date(from) } : {}), ...(end ? { lte: end } : {}) } } : {};

  // The stage cards count what the other filters allow, so the numbers always
  // add up to the table below them.
  const scopeWhere = { ...(owner ? { ownerId: owner } : {}), ...textWhere, ...dateWhere };

  const [leads, counts, owners] = await Promise.all([
    prisma.enquiry.findMany({
      where: { ...scopeWhere, ...(status && status !== "ALL" ? { status: status as never } : {}) },
      orderBy: [{ nextFollowUpAt: "asc" }, { createdAt: "desc" }],
      take: 200,
      include: { owner: { select: { name: true } }, client: { select: { id: true, name: true } } },
    }),
    prisma.enquiry.groupBy({ by: ["status"], _count: { _all: true }, where: scopeWhere }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }),
  ]);

  const countFor = (s: string) => counts.find((c) => c.status === s)?._count._all ?? 0;
  const total = counts.reduce((sum, c) => sum + c._count._all, 0);
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  /** Keeps the current search and dates when a stage or owner chip is clicked. */
  const withParams = (changes: Record<string, string | undefined>) => {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries({ status, owner, q, from, to, ...changes })) {
      if (value) next.set(key, value);
    }
    return next.size ? `/admin/leads?${next}` : "/admin/leads";
  };

  return (
    <>
      <PageHeader
        title="Leads"
        description="Every enquiry from the website plus anything added by the team, tracked through the pipeline."
        actions={
          canEdit(session.role, "leads") ? (
            <Link
              href="/admin/leads/new"
              className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800"
            >
              <Plus className="size-4" aria-hidden /> Add lead
            </Link>
          ) : null
        }
      />

      {/* Search, date range, import, export and report. Stage chips are left
          off here because the summary cards below already are the stage filter. */}
      <DataTools dataset="leads" statuses={false} />

      <div className="mb-6 grid gap-2 sm:grid-cols-3 lg:grid-cols-7">
        <Link
          href={withParams({ status: undefined })}
          className={cn(
            "rounded-xl border px-4 py-3 transition-colors",
            !status || status === "ALL"
              ? "border-navy-900 bg-navy-900 text-white"
              : "border-navy-900/10 bg-white hover:border-gold-400",
          )}
        >
          <span className="block text-lg font-semibold">{total}</span>
          <span className="text-xs opacity-80">All</span>
        </Link>
        {STAGES.map((s) => (
          <Link
            key={s}
            href={withParams({ status: s })}
            className={cn(
              "rounded-xl border px-4 py-3 transition-colors",
              status === s ? "border-navy-900 bg-navy-900 text-white" : "border-navy-900/10 bg-white hover:border-gold-400",
            )}
          >
            <span className="block text-lg font-semibold">{countFor(s)}</span>
            <span className="text-xs opacity-80">{s.charAt(0) + s.slice(1).toLowerCase()}</span>
          </Link>
        ))}
      </div>

      <div className="mb-5 flex flex-wrap gap-2">
        <Link
          href={withParams({ owner: undefined })}
          className={cn(
            "rounded-full px-3.5 py-1.5 text-xs font-medium",
            !owner ? "bg-navy-900 text-white" : "border border-navy-900/15 text-navy-700 hover:bg-gold-50",
          )}
        >
          Everyone
        </Link>
        {owners.map((o) => (
          <Link
            key={o.id}
            href={withParams({ owner: o.id })}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium",
              owner === o.id ? "bg-navy-900 text-white" : "border border-navy-900/15 text-navy-700 hover:bg-gold-50",
            )}
          >
            {o.name}
          </Link>
        ))}
      </div>

      {leads.length === 0 ? (
        <EmptyState
          title={term ? `Nothing matches “${term}”` : "No leads here"}
          description={
            term
              ? "Try a shorter search, or clear the filters above."
              : "Website enquiries land here automatically — or add one by hand."
          }
          action={
            canEdit(session.role, "leads") && !term ? (
              <Link href="/admin/leads/new" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white">
                Add a lead
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
                  <th className="px-5 py-3 font-medium">Lead</th>
                  <th className="px-5 py-3 font-medium">Interest</th>
                  <th className="px-5 py-3 font-medium">Owner</th>
                  <th className="px-5 py-3 font-medium">Stage</th>
                  <th className="px-5 py-3 font-medium">Follow-up</th>
                  <th className="px-5 py-3 font-medium">Received</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {leads.map((lead) => {
                  const overdue =
                    lead.nextFollowUpAt && lead.nextFollowUpAt <= today && lead.status !== "WON" && lead.status !== "LOST";
                  return (
                    <tr key={lead.id} className={cn("hover:bg-slate-50/70", !lead.isRead && "bg-gold-50/40")}>
                      <td className="px-5 py-3.5">
                        <Link href={`/admin/leads/${lead.id}`} className="block">
                          <span className="flex items-center gap-2 font-medium text-navy-900 hover:text-gold-700">
                            {lead.name}
                            {!lead.isRead ? <Badge tone="warn">New</Badge> : null}
                            {lead.score >= 70 ? <Flame className="size-3.5 text-gold-600" aria-label="Hot lead" /> : null}
                          </span>
                          <span className="block text-xs text-slate-500">{lead.company || lead.email}</span>
                        </Link>
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">
                        {lead.serviceInterest || "—"}
                        {lead.budget ? <span className="block text-xs text-slate-400">{lead.budget}</span> : null}
                      </td>
                      <td className="px-5 py-3.5 text-slate-600">{lead.owner?.name ?? "Unassigned"}</td>
                      <td className="px-5 py-3.5">
                        <Badge tone={TONE[lead.status]}>{lead.status.toLowerCase()}</Badge>
                        {lead.client ? (
                          <Link
                            href={`/admin/clients/${lead.client.id}`}
                            className="mt-1 block text-xs text-gold-700 hover:underline"
                          >
                            {lead.client.name}
                          </Link>
                        ) : null}
                      </td>
                      <td className="px-5 py-3.5 text-xs">
                        {lead.nextFollowUpAt ? (
                          <span
                            className={cn(
                              "inline-flex items-center gap-1",
                              overdue ? "font-medium text-red-600" : "text-slate-500",
                            )}
                          >
                            <CircleDot className="size-3" aria-hidden />
                            {formatDate(lead.nextFollowUpAt)}
                          </span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-xs text-slate-500">{formatDate(lead.createdAt)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
