"use client";

import { useActionState, useEffect, useId, useRef, useState, useTransition } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CalendarRange,
  Download,
  FileSpreadsheet,
  Loader2,
  Search,
  Upload,
  X,
} from "lucide-react";
import { importDataset, type ImportState } from "@/app/admin/actions/data";
import { Alert, inputClass } from "@/components/admin/ui";
import { cn } from "@/lib/utils";

export type StatusChip = { value: string; label: string };
export type ImportFieldInfo = { column: string; example: string; required?: boolean; note?: string };

/**
 * Search, filters, import, export and report for one list.
 *
 * Every control writes into the page's own query string, so the list, the CSV
 * export and the printable report all read the same filter set and can never
 * disagree about what "the current view" means.
 */
export function DataToolbar({
  dataset,
  searchHint,
  statuses,
  importFields,
  canImport = false,
  showDateRange = true,
  showSearch = true,
  children,
}: {
  dataset: string;
  searchHint: string;
  statuses?: StatusChip[];
  /** Present only when the dataset registers an importer. */
  importFields?: ImportFieldInfo[];
  canImport?: boolean;
  showDateRange?: boolean;
  /** Off where the list already searches itself, so there is only ever one box. */
  showSearch?: boolean;
  /** Extra module-specific filters, rendered beside the search box. */
  children?: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [importOpen, setImportOpen] = useState(false);
  const [datesOpen, setDatesOpen] = useState(Boolean(params.get("from") || params.get("to")));

  const q = params.get("q") ?? "";
  const status = params.get("status") ?? "";
  const from = params.get("from") ?? "";
  const to = params.get("to") ?? "";
  const searchId = useId();

  /** Rewrite one or more params, dropping any that go empty. */
  const setParams = (changes: Record<string, string>) => {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(changes)) {
      if (value) next.set(key, value);
      else next.delete(key);
    }
    startTransition(() => router.replace(next.size ? `${pathname}?${next}` : pathname, { scroll: false }));
  };

  const exportHref = `/api/admin/export?${new URLSearchParams({ ...paramsToObject(params), dataset })}`;
  const reportHref = `/admin/print/report/${dataset}?${new URLSearchParams(paramsToObject(params))}`;
  const filtered = Boolean(q || status || from || to);

  return (
    <div className="mb-5 space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        {showSearch ? (
          <SearchBox
            id={searchId}
            defaultValue={q}
            placeholder={searchHint}
            pending={pending}
            onSearch={(value) => setParams({ q: value })}
          />
        ) : null}

        {children}

        {showDateRange ? (
          <button
            type="button"
            onClick={() => setDatesOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-2 rounded-xl border px-3.5 py-2.5 text-sm font-medium transition-colors",
              from || to
                ? "border-gold-500 bg-gold-50 text-gold-800"
                : "border-navy-900/15 text-navy-800 hover:border-gold-500 hover:bg-gold-50",
            )}
            aria-expanded={datesOpen}
          >
            <CalendarRange className="size-4" aria-hidden />
            {from || to ? `${from || "…"} → ${to || "…"}` : "Date range"}
          </button>
        ) : null}

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {canImport && importFields?.length ? (
            <button
              type="button"
              onClick={() => setImportOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-3.5 py-2.5 text-sm font-medium text-navy-800 transition-colors hover:border-gold-500 hover:bg-gold-50"
            >
              <Upload className="size-4" aria-hidden /> Import
            </button>
          ) : null}

          <a
            href={exportHref}
            className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-3.5 py-2.5 text-sm font-medium text-navy-800 transition-colors hover:border-gold-500 hover:bg-gold-50"
          >
            <Download className="size-4" aria-hidden /> Export CSV
          </a>

          {/* Opens in its own tab so the list keeps its filters behind it. */}
          <a
            href={reportHref}
            target="_blank"
            rel="noopener"
            className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-3.5 py-2.5 text-sm font-medium text-navy-800 transition-colors hover:border-gold-500 hover:bg-gold-50"
          >
            <FileSpreadsheet className="size-4" aria-hidden /> Report
          </a>
        </div>
      </div>

      {datesOpen && showDateRange ? (
        <div className="flex flex-wrap items-end gap-3 rounded-xl border border-navy-900/10 bg-slate-50 px-4 py-3">
          <label className="text-xs font-medium text-slate-600">
            From
            <input
              type="date"
              value={from}
              onChange={(e) => setParams({ from: e.target.value })}
              className={cn(inputClass, "mt-1 py-1.5")}
            />
          </label>
          <label className="text-xs font-medium text-slate-600">
            To
            <input
              type="date"
              value={to}
              onChange={(e) => setParams({ to: e.target.value })}
              className={cn(inputClass, "mt-1 py-1.5")}
            />
          </label>
          {from || to ? (
            <button
              type="button"
              onClick={() => setParams({ from: "", to: "" })}
              className="pb-2 text-xs font-medium text-slate-500 hover:text-red-600"
            >
              Clear dates
            </button>
          ) : null}
        </div>
      ) : null}

      {statuses?.length ? (
        <div className="flex flex-wrap items-center gap-2">
          <Chip active={!status} onClick={() => setParams({ status: "" })}>
            All
          </Chip>
          {statuses.map((s) => (
            <Chip key={s.value} active={status === s.value} onClick={() => setParams({ status: s.value })}>
              {s.label}
            </Chip>
          ))}
        </div>
      ) : null}

      {filtered ? (
        <button
          type="button"
          onClick={() => setParams({ q: "", status: "", from: "", to: "" })}
          className="inline-flex items-center gap-1.5 text-xs font-medium text-slate-500 hover:text-red-600"
        >
          <X className="size-3.5" aria-hidden /> Clear all filters
        </button>
      ) : null}

      {importOpen && importFields ? (
        <ImportDialog dataset={dataset} fields={importFields} onClose={() => setImportOpen(false)} />
      ) : null}
    </div>
  );
}

function paramsToObject(params: URLSearchParams) {
  const out: Record<string, string> = {};
  params.forEach((value, key) => {
    if (value) out[key] = value;
  });
  return out;
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
        active
          ? "bg-navy-900 text-white"
          : "border border-navy-900/15 text-navy-700 hover:border-gold-500 hover:bg-gold-50",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Search box that pushes to the URL 350 ms after typing stops.
 *
 * The input keeps its own value so it never loses a keystroke to the router
 * transition, and Enter searches immediately for anyone who does not wait.
 */
function SearchBox({
  id,
  defaultValue,
  placeholder,
  pending,
  onSearch,
}: {
  id: string;
  defaultValue: string;
  placeholder: string;
  pending: boolean;
  onSearch: (value: string) => void;
}) {
  const [value, setValue] = useState(defaultValue);
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // The pending timeout must call the newest handler, not the one captured when
  // the keystroke landed — otherwise it would push a stale filter set.
  const latest = useRef(onSearch);
  useEffect(() => {
    latest.current = onSearch;
  });

  // Reflect a reset done elsewhere on the toolbar (Clear all filters).
  const [lastExternal, setLastExternal] = useState(defaultValue);
  if (defaultValue !== lastExternal) {
    setLastExternal(defaultValue);
    setValue(defaultValue);
  }

  useEffect(() => () => clearTimeout(timer.current), []);

  const schedule = (next: string) => {
    setValue(next);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => latest.current(next.trim()), 350);
  };

  return (
    <div className="relative min-w-[15rem] flex-1 sm:max-w-sm">
      <Search className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-slate-400" aria-hidden />
      <input
        id={id}
        type="search"
        value={value}
        onChange={(e) => schedule(e.target.value)}
        onKeyDown={(e) => {
          if (e.key !== "Enter") return;
          e.preventDefault();
          clearTimeout(timer.current);
          onSearch(value.trim());
        }}
        placeholder={placeholder}
        aria-label={placeholder}
        className={cn(inputClass, "pl-10")}
      />
      {pending ? (
        <Loader2 className="absolute right-3.5 top-1/2 size-4 -translate-y-1/2 animate-spin text-slate-400" aria-hidden />
      ) : null}
    </div>
  );
}

function ImportDialog({
  dataset,
  fields,
  onClose,
}: {
  dataset: string;
  fields: ImportFieldInfo[];
  onClose: () => void;
}) {
  const router = useRouter();
  const [state, action, pending] = useActionState<ImportState, FormData>(importDataset, {});

  // Closing on Escape is expected of a modal and costs one listener.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  const done = state.result;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-navy-950/40 p-4 backdrop-blur-sm">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={`${dataset}-import-title`}
        className="max-h-[85vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-6 shadow-brand"
      >
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id={`${dataset}-import-title`} className="text-lg font-semibold text-navy-900">
              Bulk import
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Upload a CSV. Existing records are updated rather than duplicated.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-navy-900"
            aria-label="Close"
          >
            <X className="size-5" />
          </button>
        </div>

        {done ? (
          <div className="mt-5 space-y-4">
            <Alert tone={done.errors.length ? "error" : "success"}>
              {done.created} created · {done.updated} updated · {done.skipped} skipped
              {done.errors.length ? ` · ${done.errors.length} row(s) rejected` : ""}
            </Alert>

            {done.errors.length ? (
              <ul className="max-h-48 space-y-1 overflow-y-auto rounded-xl bg-slate-50 p-4 text-xs text-slate-600">
                {done.errors.map((error) => (
                  <li key={error}>{error}</li>
                ))}
              </ul>
            ) : null}

            <button
              type="button"
              onClick={() => {
                router.refresh();
                onClose();
              }}
              className="w-full rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
            >
              Done
            </button>
          </div>
        ) : (
          <form action={action} className="mt-5 space-y-5">
            <input type="hidden" name="dataset" value={dataset} />

            {state.error ? <Alert tone="error">{state.error}</Alert> : null}

            <div className="rounded-xl border border-navy-900/10 bg-slate-50 p-4">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <p className="text-sm font-medium text-navy-900">Accepted columns</p>
                <a
                  href={`/api/admin/import-template?dataset=${dataset}`}
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-gold-700 hover:underline"
                >
                  <Download className="size-3.5" aria-hidden /> Download template
                </a>
              </div>
              <ul className="mt-3 grid gap-1.5 sm:grid-cols-2">
                {fields.map((field) => (
                  <li key={field.column} className="text-xs text-slate-600">
                    <span className="font-medium text-navy-900">{field.column}</span>
                    {field.required ? <span className="text-gold-600"> *</span> : null}
                    <span className="text-slate-400"> — {field.note ?? `e.g. ${field.example}`}</span>
                  </li>
                ))}
              </ul>
              <p className="mt-3 text-xs text-slate-500">
                Column order does not matter, and spelling is matched loosely — “Company Name” and “company_name” both
                work. Extra columns are ignored.
              </p>
            </div>

            <input
              type="file"
              name="file"
              accept=".csv,text/csv"
              required
              className="w-full rounded-xl border border-navy-900/15 p-2.5 text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-navy-900 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-white hover:file:bg-navy-800"
            />

            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-navy-900/15 px-5 py-2.5 text-sm font-medium text-navy-800 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={pending}
                className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
              >
                {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Upload className="size-4" aria-hidden />}
                {pending ? "Importing…" : "Import"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
