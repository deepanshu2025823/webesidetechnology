import "server-only";
import { prisma } from "@/lib/prisma";

/**
 * Human-readable record numbers (CL-0007, QT-2026-0012, PRJ-0004).
 *
 * Derived from the current row count rather than a counter table, then checked
 * for collisions so a deleted record can't hand out a number twice.
 */
type Sequence = "client" | "quotation" | "project";

const PREFIX: Record<Sequence, string> = { client: "CL", quotation: "QT", project: "PRJ" };

export async function nextCode(kind: Sequence): Promise<string> {
  const year = new Date().getFullYear();
  const prefix = kind === "quotation" ? `${PREFIX[kind]}-${year}` : PREFIX[kind];

  const existing = await taken(kind, prefix);
  let n = existing.size + 1;
  let code = `${prefix}-${String(n).padStart(4, "0")}`;

  while (existing.has(code)) {
    n += 1;
    code = `${prefix}-${String(n).padStart(4, "0")}`;
  }

  return code;
}

async function taken(kind: Sequence, prefix: string): Promise<Set<string>> {
  const where = { code: { startsWith: prefix } };

  if (kind === "client") {
    const rows = await prisma.client.findMany({ where, select: { code: true } });
    return new Set(rows.map((r) => r.code));
  }
  if (kind === "project") {
    const rows = await prisma.clientProject.findMany({ where, select: { code: true } });
    return new Set(rows.map((r) => r.code));
  }
  const rows = await prisma.quotation.findMany({
    where: { number: { startsWith: prefix } },
    select: { number: true },
  });
  return new Set(rows.map((r) => r.number));
}
