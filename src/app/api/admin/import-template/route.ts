import { NextResponse } from "next/server";
import { getSession } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { getDataset } from "@/lib/admin/datasets";
import { toCsv } from "@/lib/admin/csv";

/**
 * A ready-to-fill CSV for a dataset's importer: the accepted headers plus one
 * example row. Handing this out is what stops most import failures — people
 * edit a known-good file instead of guessing at column names.
 */
export async function GET(request: Request) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const url = new URL(request.url);
  const dataset = getDataset(url.searchParams.get("dataset") ?? "");
  if (!dataset?.importer) return NextResponse.json({ error: "Unknown dataset" }, { status: 404 });

  if (!canEdit(session.role, dataset.module)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const fields = dataset.importer.fields;
  const csv = toCsv(
    fields.map((f) => f.column),
    [fields.map((f) => f.example)],
  );

  return new NextResponse(csv, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${dataset.key}-import-template.csv"`,
      "Cache-Control": "no-store",
    },
  });
}
