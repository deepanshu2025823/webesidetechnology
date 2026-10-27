"use client";

import Link from "next/link";
import { RefreshCw, ShieldAlert } from "lucide-react";

/**
 * A page opened before a deploy still points at the previous build: its save
 * buttons call action IDs, and load chunks, that the new server no longer has.
 * Nothing is broken on the server — the page only needs reloading.
 */
const STALE_BUILD = /Server Action .*not found|Failed to find Server Action|ChunkLoadError|Loading chunk .* failed/i;

/** Turns a thrown FORBIDDEN from a guard or server action into a clear screen. */
export default function AdminError({ error, reset }: { error: Error; reset: () => void }) {
  const forbidden = error.message === "FORBIDDEN";
  const unauthorized = error.message === "UNAUTHORIZED";

  if (STALE_BUILD.test(`${error.name} ${error.message}`)) {
    return (
      <div className="grid min-h-[60vh] place-items-center">
        <div className="max-w-md rounded-2xl border border-navy-900/10 bg-white p-8 text-center shadow-sm">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-gold-500/15 text-gold-700">
            <RefreshCw className="size-6" aria-hidden />
          </span>
          <h1 className="mt-5 text-lg font-semibold text-navy-900">The admin panel was just updated</h1>
          <p className="mt-2 text-sm text-slate-600">
            This page was opened before the update, so the last save did not go through. Reload the page and save
            again.
          </p>
          <button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white"
          >
            <RefreshCw className="size-4" aria-hidden /> Reload page
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid min-h-[60vh] place-items-center">
      <div className="max-w-md rounded-2xl border border-navy-900/10 bg-white p-8 text-center shadow-sm">
        <span className="mx-auto grid size-12 place-items-center rounded-full bg-gold-500/15 text-gold-700">
          <ShieldAlert className="size-6" aria-hidden />
        </span>

        <h1 className="mt-5 text-lg font-semibold text-navy-900">
          {forbidden ? "You don't have access to this" : unauthorized ? "Your session has expired" : "Something went wrong"}
        </h1>

        <p className="mt-2 text-sm text-slate-600">
          {forbidden
            ? "Your role doesn't include this section. Ask a Super Admin to change your access if you need it."
            : unauthorized
              ? "Please sign in again to continue."
              : "The page could not be loaded. Try again, or head back to the dashboard."}
        </p>

        <div className="mt-6 flex justify-center gap-3">
          {unauthorized ? (
            <Link href="/admin/login" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white">
              Sign in
            </Link>
          ) : (
            <>
              <Link href="/admin" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white">
                Back to dashboard
              </Link>
              {!forbidden ? (
                <button
                  type="button"
                  onClick={reset}
                  className="rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-medium text-navy-800 hover:bg-slate-50"
                >
                  Try again
                </button>
              ) : null}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
