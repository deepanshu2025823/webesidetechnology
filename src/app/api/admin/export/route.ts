import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canView } from "@/lib/permissions";
import { getDataset, readFilters } from "@/lib/admin/datasets";
import { toCsv } from "@/lib/admin/csv";

/**
 * CSV export for any registered dataset.
 *
 * The query string is the same one the list page is already using, so the file
 * contains exactly the rows on screen — a filtered, searched view exports as
 * that view rather than as the whole table.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const dataset = getDataset(url.searchParams.get("dataset") ?? "");
  if (!dataset) return NextResponse.json({ error: "Unknown dataset" }, { status: 404 });

  if (!canView(session.role, dataset.module)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { headers, rows } = await dataset.fetch(readFilters(url.searchParams));
  const stamp = new Date().toISOString().slice(0, 10);

  return new NextResponse(toCsv(headers, rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${dataset.key}-${stamp}.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
