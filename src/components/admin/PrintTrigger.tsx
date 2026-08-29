"use client";

import { Printer, X } from "lucide-react";

/** Floating controls, hidden from the printed output. */
export function PrintTrigger() {
  return (
    <div className="fixed right-6 top-6 z-50 flex gap-2 print:hidden">
      <button
        type="button"
        onClick={() => window.print()}
        className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg hover:bg-navy-800"
      >
        <Printer className="size-4" aria-hidden /> Save as PDF
      </button>
      <button
        type="button"
        onClick={() => window.close()}
        className="grid size-10 place-items-center rounded-xl border border-navy-900/15 bg-white text-navy-800 shadow-sm hover:bg-slate-50"
        aria-label="Close"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
