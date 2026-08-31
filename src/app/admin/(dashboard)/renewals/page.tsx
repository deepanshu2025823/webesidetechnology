import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { EmptyState, PageHeader } from "@/components/admin/ui";
import { RenewalManager } from "@/components/admin/RenewalManager";
import { DataTools } from "@/components/admin/DataTools";
import { cn, formatMoney } from "@/lib/utils";

const WINDOWS = [
  { key: "OVERDUE", label: "Overdue" },
  { key: "7", label: "Next 7 days" },
  { key: "30", label: "Next 30 days" },
  { key: "90", label: "Next 90 days" },
  { key: "ALL", label: "All" },
];

export default async function RenewalsPage({
  searchParams,
}: {
  searchParams: Promise<{ window?: string; q?: string; status?: string }>;
}) {
  const session = await requireModule("renewals");
  const { window: win, q, status } = await searchParams;
  const active = win ?? "90";
  const term = q?.trim();

  const now = new Date();
  const [renewals, clients, projects, owners] = await Promise.all([
    prisma.renewal.findMany({
      where: {
        ...(status && status !== "ALL" ? { status: status as never } : { status: { notIn: ["CANCELLED"] } }),
        ...(term
          ? {
              OR: [
                { name: { contains: term } },
                { provider: { contains: term } },
                { identifier: { contains: term } },
                { client: { name: { contains: term } } },
              ],
            }
          : {}),
      },
      orderBy: { expiryDate: "asc" },
      include: { client: { select: { id: true, name: true } }, owner: { select: { name: true } } },
    }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.clientProject.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }),
  ]);

  const withDays = renewals.map((r) => ({
    ...r,
    daysLeft: Math.ceil((r.expiryDate.getTime() - now.getTime()) / 86_400_000),
  }));

  const filtered = withDays.filter((r) => {
    if (active === "ALL") return true;
    if (active === "OVERDUE") return r.daysLeft < 0;
    return r.daysLeft >= 0 && r.daysLeft <= Number(active);
  });

  const dueValue = filtered.reduce((sum, r) => sum + r.amount, 0);
  const overdueCount = withDays.filter((r) => r.daysLeft < 0).length;

  /** Window links keep whatever search and status are already applied. */
  const windowHref = (next: string) => {
    const params = new URLSearchParams({ window: next });
    for (const [key, value] of Object.entries({ q, status })) if (value) params.set(key, value);
    return `/admin/renewals?${params}`;
  };

  return (
    <>
      <PageHeader
        title="Renewals"
        description={
          overdueCount
            ? `${overdueCount} past expiry · ${formatMoney(dueValue)} in the current window.`
            : `${formatMoney(dueValue)} due in the current window. Reminders go out at 90/60/30/15/7/1 days.`
        }
      />

      <DataTools dataset="renewals" />

      <nav className="mb-5 flex flex-wrap gap-2">
        {WINDOWS.map((w) => (
          <Link
            key={w.key}
            href={windowHref(w.key)}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              active === w.key
                ? "bg-navy-900 text-white"
                : "border border-navy-900/15 text-navy-700 hover:border-gold-500 hover:bg-gold-50",
            )}
          >
            {w.label}
          </Link>
        ))}
      </nav>

      {renewals.length === 0 && !canEdit(session.role, "renewals") ? (
        <EmptyState title="No renewals tracked" description="Domains, hosting, AMCs and retainers appear here." />
      ) : (
        <RenewalManager
          editable={canEdit(session.role, "renewals")}
          canInvoice={canEdit(session.role, "finance")}
          clients={clients}
          projects={projects}
          owners={owners}
          rows={filtered.map((r) => ({
            id: r.id,
            name: r.name,
            type: r.type,
            provider: r.provider,
            identifier: r.identifier,
            expiryDate: r.expiryDate.toISOString(),
            amount: r.amount,
            status: r.status,
            balance: r.balance,
            balanceThreshold: r.balanceThreshold,
            clientId: r.client.id,
            clientName: r.client.name,
            ownerName: r.owner?.name ?? null,
            daysLeft: r.daysLeft,
          }))}
        />
      )}
    </>
  );
}
