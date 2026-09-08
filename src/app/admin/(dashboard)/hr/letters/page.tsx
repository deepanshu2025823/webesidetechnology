import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { LetterManager, type LetterRow } from "@/components/admin/LetterManager";

/**
 * Every letter HR issues — offer, internship, experience, relieving,
 * confirmation, appreciation — numbered, kept, and printable on the company
 * letterhead. Candidates from the placement pipeline can be issued one too,
 * because an academy intern is usually not on the payroll.
 */
export default async function LettersPage() {
  const session = await requireModule("team");

  const [letters, employees, candidates] = await Promise.all([
    prisma.hrLetter.findMany({
      orderBy: { issuedAt: "desc" },
      take: 300,
      include: { issuedBy: { select: { name: true } } },
    }),
    prisma.employee.findMany({
      where: { isActive: true },
      select: { id: true, name: true, designation: true, department: true },
      orderBy: { name: "asc" },
    }),
    prisma.candidate.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" },
      take: 500,
    }),
  ]);

  const rows: LetterRow[] = letters.map((l) => ({
    id: l.id,
    refNo: l.refNo,
    type: l.type,
    personName: l.personName,
    designation: l.designation,
    department: l.department,
    startDate: l.startDate ? l.startDate.toISOString() : null,
    endDate: l.endDate ? l.endDate.toISOString() : null,
    status: l.status,
    issuedAt: l.issuedAt.toISOString(),
    issuedBy: l.issuedBy?.name ?? null,
  }));

  const issued = rows.filter((r) => r.status === "ISSUED").length;

  return (
    <>
      <PageHeader
        title="Letters"
        description={`${rows.length} letter(s) on record, ${issued} issued. Wording is generated from each record, so every certificate of the same type reads alike.`}
      />

      <LetterManager
        rows={rows}
        employees={employees}
        candidates={candidates}
        editable={canEdit(session.role, "team")}
      />
    </>
  );
}
