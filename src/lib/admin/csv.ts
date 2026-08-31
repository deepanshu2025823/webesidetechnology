/**
 * CSV read/write for the admin import and export tools.
 *
 * Written by hand rather than pulled from a package because the requirements
 * are small and fixed: RFC 4180 quoting, CRLF rows, and a parser tolerant of
 * the two things real files from Excel and Google Sheets always have — a BOM
 * and stray blank lines.
 */

/** Quote a single field only when it would otherwise break the row. */
function escapeCell(value: unknown): string {
  if (value === null || value === undefined) return "";
  const text = String(value);
  if (!/[",\r\n]/.test(text)) return text;
  return `"${text.replace(/"/g, '""')}"`;
}

export function toCsv(headers: string[], rows: (string | number | null | undefined)[][]): string {
  const lines = [headers.map(escapeCell).join(",")];
  for (const row of rows) lines.push(row.map(escapeCell).join(","));
  // Excel on Windows needs CRLF; the BOM stops it mangling ₹ and other UTF-8.
  return "﻿" + lines.join("\r\n") + "\r\n";
}

/**
 * Parse a CSV into objects keyed by the header row.
 *
 * Keys are normalised (lower-cased, non-alphanumerics stripped) so "Company
 * Name", "company_name" and "companyname" all resolve to the same field — the
 * header a client types is never going to match ours exactly.
 */
export function parseCsv(text: string): Record<string, string>[] {
  const table = parseRows(text.replace(/^﻿/, ""));
  if (!table.length) return [];

  const headers = table[0].map(normaliseKey);
  const out: Record<string, string>[] = [];

  for (const row of table.slice(1)) {
    // A trailing newline yields one empty row; so does a spacer line.
    if (row.every((cell) => cell.trim() === "")) continue;
    const record: Record<string, string> = {};
    headers.forEach((key, i) => {
      if (key) record[key] = (row[i] ?? "").trim();
    });
    out.push(record);
  }

  return out;
}

export function normaliseKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** Character-by-character split that respects quoted cells containing , and \n. */
function parseRows(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let cell = "";
  let quoted = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];

    if (quoted) {
      if (char === '"') {
        if (text[i + 1] === '"') {
          cell += '"';
          i++;
        } else {
          quoted = false;
        }
      } else {
        cell += char;
      }
      continue;
    }

    if (char === '"') {
      quoted = true;
    } else if (char === ",") {
      row.push(cell);
      cell = "";
    } else if (char === "\n") {
      row.push(cell);
      rows.push(row);
      row = [];
      cell = "";
    } else if (char !== "\r") {
      cell += char;
    }
  }

  if (cell !== "" || row.length) {
    row.push(cell);
    rows.push(row);
  }

  return rows;
}

/** Read a value under any of several accepted header spellings. */
export function pick(row: Record<string, string>, ...names: string[]): string {
  for (const name of names) {
    const value = row[normaliseKey(name)];
    if (value) return value;
  }
  return "";
}

/** Parse the date formats people actually paste: ISO, dd/mm/yyyy, dd-mm-yyyy. */
export function parseDate(value: string): Date | null {
  const raw = value.trim();
  if (!raw) return null;

  const dmy = raw.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    const date = new Date(Number(y), Number(m) - 1, Number(d));
    return Number.isNaN(date.getTime()) ? null : date;
  }

  const date = new Date(raw);
  return Number.isNaN(date.getTime()) ? null : date;
}

/** Money as typed by a human: "1,20,000", "₹45000", "45000.00". */
export function parseAmount(value: string): number {
  const cleaned = value.replace(/[^\d.-]/g, "");
  if (!cleaned) return 0;
  const n = Number(cleaned);
  return Number.isFinite(n) ? Math.round(n) : 0;
}

/**
 * Match free text to an enum member, so "on hold", "On_Hold" and "ON HOLD" all
 * land on ON_HOLD. Returns the fallback when nothing matches.
 */
export function parseEnum<T extends string>(value: string, allowed: readonly T[], fallback: T): T {
  const key = normaliseKey(value);
  if (!key) return fallback;
  return allowed.find((option) => normaliseKey(option) === key) ?? fallback;
}
