"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, X } from "lucide-react";
import { cn } from "@/lib/utils";

export type SidePopup = {
  id: string;
  title: string;
  body: string;
  ctaLabel: string;
  ctaUrl: string;
  image: string | null;
  tabLabel: string;
  side: string;
  delaySeconds: number;
};

type State = "waiting" | "open" | "tucked";

const STORE = "sahab-popups-tucked";
const PHONE = "(max-width: 639px)";

function tuckedIds(): string[] {
  try {
    return JSON.parse(sessionStorage.getItem(STORE) ?? "[]");
  } catch {
    return [];
  }
}

function remember(ids: string[]) {
  try {
    sessionStorage.setItem(STORE, JSON.stringify(ids));
  } catch {
    // Private mode or blocked storage: it just opens again on the next page.
  }
}

/**
 * Cards that slide in from the side after a short delay, like an ad panel.
 *
 * Closing one slides it back out and leaves a tab on the edge, so the offer is
 * one click away without covering the page again; the choice holds for the rest
 * of the visit. On a phone there is room for one card, so a popup whose turn
 * comes while another is open waits tucked on its tab instead.
 */
export function SidePopups({ popups }: { popups: SidePopup[] }) {
  const [state, setState] = useState<Record<string, State>>({});

  useEffect(() => {
    const tucked = new Set(tuckedIds());

    // One closed earlier in this visit goes straight to its tab; the rest slide
    // in once their delay is up.
    const timers = popups.map((p) =>
      window.setTimeout(
        () => {
          setState((prev) => {
            if ((prev[p.id] ?? "waiting") !== "waiting") return prev;
            if (tucked.has(p.id)) return { ...prev, [p.id]: "tucked" };
            const phone = window.matchMedia(PHONE).matches;
            const busy = phone && Object.values(prev).includes("open");
            return { ...prev, [p.id]: busy ? "tucked" : "open" };
          });
        },
        tucked.has(p.id) ? 0 : Math.max(0, p.delaySeconds) * 1000,
      ),
    );
    return () => timers.forEach((t) => window.clearTimeout(t));
  }, [popups]);

  const close = (id: string) => {
    setState((prev) => ({ ...prev, [id]: "tucked" }));
    remember([...new Set([...tuckedIds(), id])]);
  };

  const reopen = (id: string) =>
    setState((prev) => {
      const phone = window.matchMedia(PHONE).matches;
      // On a phone, opening one tucks whichever was open.
      const next = phone
        ? Object.fromEntries(Object.entries(prev).map(([k, v]) => [k, v === "open" ? "tucked" : v]))
        : { ...prev };
      return { ...next, [id]: "open" };
    });

  if (!popups.length) return null;

  return (
    <>
      {popups.map((p, index) => {
        const left = p.side === "LEFT";
        const s = state[p.id] ?? "waiting";
        // Two on the same side sit one above the other.
        const sameSideBefore = popups.slice(0, index).filter((o) => (o.side === "LEFT") === left).length;
        const top = `calc(${28 + sameSideBefore * 22}vh)`;
        const external = /^https?:\/\//i.test(p.ctaUrl);

        return (
          <div key={p.id} aria-live="polite">
            {/* The card */}
            <aside
              aria-label={p.title}
              aria-hidden={s !== "open"}
              inert={s !== "open"}
              style={{ top }}
              className={cn(
                "fixed z-40 w-[min(20rem,calc(100vw-3.5rem))] transition-transform duration-500 ease-out",
                left ? "left-0" : "right-0",
                s === "open"
                  ? "translate-x-0"
                  : left
                    ? "-translate-x-[110%]"
                    : "translate-x-[110%]",
              )}
            >
              <div
                className={cn(
                  "relative overflow-hidden border border-gold-400/40 bg-navy-950 text-white shadow-2xl",
                  left ? "rounded-r-2xl border-l-0" : "rounded-l-2xl border-r-0",
                )}
              >
                <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold-700 via-gold-400 to-gold-700" />
                {p.image ? (
                  <div className="relative aspect-[2/1]">
                    <Image src={p.image} alt="" fill sizes="320px" className="object-cover" />
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => close(p.id)}
                  aria-label={`Close: ${p.title}`}
                  className="absolute right-2.5 top-2.5 grid size-8 place-items-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/25"
                >
                  <X className="size-4" aria-hidden />
                </button>
                <div className="p-5 pr-12">
                  <p className="font-display text-xl leading-snug text-white">{p.title}</p>
                  {p.body ? <p className="mt-2 text-sm leading-relaxed text-navy-200">{p.body}</p> : null}
                  {p.ctaLabel && p.ctaUrl ? (
                    <Link
                      href={p.ctaUrl}
                      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
                      onClick={() => close(p.id)}
                      className="mt-4 inline-flex items-center gap-2 rounded-full bg-gold-500 px-4 py-2 text-sm font-semibold text-navy-950 transition-colors hover:bg-gold-400"
                    >
                      {p.ctaLabel}
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  ) : null}
                </div>
              </div>
            </aside>

            {/* The tab it tucks back to */}
            <button
              type="button"
              onClick={() => reopen(p.id)}
              aria-label={`Open: ${p.title}`}
              style={{ top }}
              className={cn(
                "fixed z-40 flex items-center gap-1.5 bg-gold-500 px-1.5 py-3 text-xs font-semibold uppercase tracking-wider text-navy-950 shadow-lg transition-transform duration-500 [writing-mode:vertical-rl] hover:bg-gold-400",
                left ? "left-0 rotate-180 rounded-l-lg" : "right-0 rounded-l-lg",
                s === "tucked" ? "translate-x-0" : left ? "-translate-x-full" : "translate-x-full",
              )}
              tabIndex={s === "tucked" ? 0 : -1}
            >
              {p.tabLabel || p.title}
            </button>
          </div>
        );
      })}
    </>
  );
}
