import { getSession } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { getDataset } from "@/lib/admin/datasets";
import { DataToolbar } from "@/components/admin/DataToolbar";

/**
 * Server-side wrapper that reads the dataset registry and hands the toolbar
 * plain, serialisable props.
 *
 * The registry is `server-only` (it holds Prisma queries), so this is the seam
 * that keeps the client bundle free of it while list pages still opt in with a
 * single tag: `<DataTools dataset="leads" />`.
 */
export async function DataTools({
  dataset: key,
  statuses = true,
  showDateRange = true,
  showSearch = true,
  children,
}: {
  dataset: string;
  /** Set false when the page already renders its own stage filter. */
  statuses?: boolean;
  showDateRange?: boolean;
  /** Set false when the list already has its own search box. */
  showSearch?: boolean;
  children?: React.ReactNode;
}) {
  const dataset = getDataset(key);
  if (!dataset) return null;

  const session = await getSession();
  const mayImport = Boolean(session && dataset.importer && canEdit(session.role, dataset.module));

  return (
    <DataToolbar
      dataset={dataset.key}
      searchHint={dataset.searchHint}
      statuses={statuses ? dataset.statuses : undefined}
      importFields={mayImport ? dataset.importer?.fields : undefined}
      canImport={mayImport}
      showDateRange={showDateRange}
      showSearch={showSearch}
    >
      {children}
    </DataToolbar>
  );
}
