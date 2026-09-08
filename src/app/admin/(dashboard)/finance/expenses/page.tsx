import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { DataTools } from "@/components/admin/DataTools";
import { MoneyRegister, type MoneyRow } from "@/components/admin/MoneyRegister";
import { cn } from "@/lib/utils";

type Search = { q?: string; from?: string; to?: string; view?: string };

const VIEWS = [
  { id: "all", label: "Everything" },
  { id: "income", label: "Income" },
  { id: "expense", label: "Expenses" },
  { id: "open", label: "Due & expected" },
] as const;

/**
 * The money register — income and expenses in one ledger.
 *
 * Invoiced revenue is tracked under Invoices and Payments; this is where
 * everything else goes: academy fees, placement commission, salaries, rent,
 * subscriptions, ad spend. Anything not yet settled can carry a due date and a
 * reminder, which the nightly sweep raises.
 */
export default async function MoneyRegisterPage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requireModule("finance");
  const { q, from, to, view: viewRaw } = await searchParams;

  const view = VIEWS.some((v) => v.id === viewRaw) ? (viewRaw as (typeof VIEWS)[number]["id"]) : "all";
  const term = q?.trim();
  const end = to ? new Date(to) : undefined;
  if (end) end.setHours(23, 59, 59, 999);

  const directionFilter =
    view === "income" ? { direction: "INCOME" as const } : view === "expense" ? { direction: "EXPENSE" as const } : {};

  const entries = await prisma.expense.findMany({
    where: {
      ...directionFilter,
      ...(view === "open" ? { isSettled: false } : {}),
      ...(term
        ? {
            OR: [
              { title: { contains: term } },
              { vendor: { contains: term } },
              { category: { contains: term } },
              { reference: { contains: term } },
              { notes: { contains: term } },
            ],
          }
        : {}),
      ...(from || end ? { spentAt: { ...(from ? { gte: new Date(from) } : {}), ...(end ? { lte: end } : {}) } } : {}),
    },
    // Open entries are what needs acting on, so they sort by when they fall due.
    orderBy: view === "open" ? { dueDate: "asc" } : { spentAt: "desc" },
    take: 300,
    include: { client: { select: { name: true } }, project: { select: { name: true } } },
  });

  const [clients, projects, services] = await Promise.all([
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.clientProject.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ select: { id: true, title: true }, orderBy: { order: "asc" } }),
  ]);

  const rows: MoneyRow[] = entries.map((e) => ({
    id: e.id,
    direction: e.direction,
    title: e.title,
    category: e.category,
    amount: e.amount,
    vendor: e.vendor,
    paymentMode: e.paymentMode,
    reference: e.reference,
    spentAt: e.spentAt.toISOString(),
    dueDate: e.dueDate ? e.dueDate.toISOString() : null,
    isSettled: e.isSettled,
    remind: e.remind,
    remindDaysBefore: e.remindDaysBefore,
    recurrence: e.recurrence,
    clientName: e.client?.name ?? null,
    projectName: e.project?.name ?? null,
  }));

  // Carried through the tab links so a search or date range survives a switch.
  const keep = new URLSearchParams();
  if (term) keep.set("q", term);
  if (from) keep.set("from", from);
  if (to) keep.set("to", to);

  return (
    <>
      <PageHeader
        title="Income & expenses"
        description="Every rupee in and out that does not come through an invoice — recorded, categorised, and reminded about when it is still due."
      />

      <nav aria-label="Filter by type" className="mb-5 flex flex-wrap gap-2">
        {VIEWS.map((v) => {
          const params = new URLSearchParams(keep);
          if (v.id !== "all") params.set("view", v.id);
          const query = params.toString();
          return (
            <Link
              key={v.id}
              href={`/admin/finance/expenses${query ? `?${query}` : ""}`}
              aria-current={view === v.id ? "page" : undefined}
              className={cn(
                "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                view === v.id
                  ? "border-navy-900 bg-navy-900 text-white"
                  : "border-navy-900/15 bg-white text-navy-800 hover:border-gold-500 hover:bg-gold-50",
              )}
            >
              {v.label}
            </Link>
          );
        })}
      </nav>

      <DataTools dataset="expenses" />

      <MoneyRegister
        editable={canEdit(session.role, "finance")}
        clients={clients}
        projects={projects}
        services={services}
        rows={rows}
        direction={view === "income" ? "INCOME" : view === "expense" ? "EXPENSE" : "ALL"}
      />
    </>
  );
}
