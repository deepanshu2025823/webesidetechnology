import { notFound } from "next/navigation";
import Image from "next/image";
import { getSession } from "@/lib/auth";
import { canView } from "@/lib/permissions";
import { getDataset, readFilters, humanise } from "@/lib/admin/datasets";
import { getSettings } from "@/lib/queries";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

type Query = Record<string, string | string[] | undefined>;

/**
 * Print-ready report for any registered dataset.
 *
 * It reads the same query string the list page used, so "export this view as a
 * report" needs no second filter UI — whatever is on screen is what prints.
 * Landscape and repeating table headers are set in CSS so a long report breaks
 * across pages sensibly.
 */
export default async function DatasetReportPage({
  params,
  searchParams,
}: {
  params: Promise<{ dataset: string }>;
  searchParams: Promise<Query>;
}) {
  const { dataset: key } = await params;
  const dataset = getDataset(key);
  if (!dataset) notFound();

  const session = await getSession();
  if (!session || !canView(session.role, dataset.module)) throw new Error("FORBIDDEN");

  const query = await searchParams;
  const flat: Record<string, string | undefined> = {};
  for (const [k, v] of Object.entries(query)) flat[k] = Array.isArray(v) ? v[0] : v;

  const [{ headers, rows, stats }, settings] = await Promise.all([
    dataset.fetch(readFilters(flat)),
    getSettings(),
  ]);

  const applied = [
    flat.q ? `Search: “${flat.q}”` : null,
    flat.status ? `Status: ${humanise(flat.status)}` : null,
    flat.from || flat.to ? `Dates: ${flat.from || "start"} → ${flat.to || "today"}` : null,
  ].filter(Boolean) as string[];

  return (
    <div className="mx-auto max-w-[1400px] px-8 py-10 print:px-0 print:py-0">
      <style>{`
        @page { size: A4 landscape; margin: 12mm; }
        @media print {
          thead { display: table-header-group; }
          tr { break-inside: avoid; }
        }
      `}</style>

      <header className="flex items-start justify-between gap-6 border-b-2 border-[#011460] pb-5">
        <div>
          <Image
            src="/brand/logo.png"
            alt={settings.siteName}
            width={1024}
            height={390}
            className="h-12 w-auto object-contain"
            priority
          />
          <h1 className="mt-4 text-2xl font-semibold text-[#011460]">{dataset.label} report</h1>
          <p className="mt-1 text-sm text-slate-500">{dataset.description}</p>
        </div>

        <div className="shrink-0 text-right text-xs text-slate-500">
          <p>
            Generated <strong className="text-[#011460]">{formatDate(new Date())}</strong>
          </p>
          <p className="mt-0.5">by {session.name}</p>
          {applied.length ? (
            <ul className="mt-3 space-y-0.5 text-left">
              {applied.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          ) : (
            <p className="mt-3">All records</p>
          )}
        </div>
      </header>

      <div className="mt-6 flex flex-wrap gap-3">
        {stats.map((stat) => (
          <div key={stat.label} className="rounded-lg border border-[#011460]/15 px-4 py-2.5">
            <p className="text-[10px] uppercase tracking-wider text-slate-500">{stat.label}</p>
            <p className="mt-0.5 text-lg font-semibold text-[#011460]">{stat.value}</p>
          </div>
        ))}
      </div>

      {rows.length === 0 ? (
        <p className="mt-10 rounded-lg bg-slate-50 px-6 py-12 text-center text-sm text-slate-500">
          No records match this view.
        </p>
      ) : (
        <table className="mt-6 w-full border-collapse text-[10px]">
          <thead>
            <tr className="bg-[#faf8f3] text-left">
              {headers.map((header) => (
                <th key={header} className="border border-[#011460]/15 px-2 py-1.5 font-semibold text-[#011460]">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i % 2 ? "bg-slate-50/60" : undefined}>
                {row.map((cell, j) => (
                  <td key={j} className="border border-[#011460]/10 px-2 py-1.5 align-top text-slate-700">
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      )}

      <footer className="mt-8 border-t border-[#011460]/15 pt-3 text-[10px] text-slate-400">
        {settings.siteName} · {rows.length} record{rows.length === 1 ? "" : "s"} · Confidential
      </footer>
    </div>
  );
}
