"use server";

import { revalidatePath } from "next/cache";
import { logActivity, requireSession } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { getDataset } from "@/lib/admin/datasets";
import { parseCsv } from "@/lib/admin/csv";

export type ImportState = {
  error?: string;
  /** Present once a file has been processed, even when some rows failed. */
  result?: { created: number; updated: number; skipped: number; errors: string[] };
};

/** Files above this are almost certainly the wrong thing being uploaded. */
const MAX_BYTES = 5 * 1024 * 1024;
const MAX_ROWS = 5000;

/**
 * Bulk CSV import for any dataset that registers an importer.
 *
 * Rows are validated and applied one at a time rather than in a transaction:
 * a spreadsheet with three bad rows out of two hundred should import the other
 * hundred and ninety-seven and tell you about the three, not reject the lot.
 */
export async function importDataset(_prev: ImportState, form: FormData): Promise<ImportState> {
  const session = await requireSession();

  const dataset = getDataset(String(form.get("dataset") ?? ""));
  if (!dataset?.importer) return { error: "This module does not support importing." };

  if (!canEdit(session.role, dataset.module)) {
    return { error: "You do not have permission to import into this module." };
  }

  const file = form.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Choose a CSV file to import." };
  if (file.size > MAX_BYTES) return { error: "That file is larger than 5 MB. Split it and import in parts." };

  let rows: Record<string, string>[];
  try {
    rows = parseCsv(await file.text());
  } catch {
    return { error: "That file could not be read as CSV. Export it again as .csv and retry." };
  }

  if (!rows.length) return { error: "No data rows found — check the file has a header row and at least one entry." };
  if (rows.length > MAX_ROWS) return { error: `That file has ${rows.length} rows; the limit is ${MAX_ROWS} per import.` };

  const result = await dataset.importer.run(rows, { userId: session.id });

  await logActivity(
    session.id,
    "import",
    dataset.label,
    undefined,
    `${result.created} created, ${result.updated} updated, ${result.skipped} skipped`,
  );

  revalidatePath("/admin", "layout");
  return { result };
}
