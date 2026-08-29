import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { ExpenseManager } from "@/components/admin/ExpenseManager";

export default async function ExpensesPage() {
  const session = await requireModule("finance");

  const [expenses, clients, projects, services] = await Promise.all([
    prisma.expense.findMany({
      orderBy: { spentAt: "desc" },
      take: 300,
      include: { client: { select: { name: true } }, project: { select: { name: true } } },
    }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.clientProject.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.service.findMany({ select: { id: true, title: true }, orderBy: { order: "asc" } }),
  ]);

  return (
    <>
      <PageHeader
        title="Expenses"
        description="Costs recorded against a client, project or service — the other half of profitability."
      />
      <ExpenseManager
        editable={canEdit(session.role, "finance")}
        clients={clients}
        projects={projects}
        services={services}
        rows={expenses.map((e) => ({
          id: e.id,
          title: e.title,
          category: e.category,
          amount: e.amount,
          vendor: e.vendor,
          spentAt: e.spentAt.toISOString(),
          clientName: e.client?.name ?? null,
          projectName: e.project?.name ?? null,
        }))}
      />
    </>
  );
}
