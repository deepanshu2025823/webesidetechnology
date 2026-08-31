"use client";

import { useEffect, useRef } from "react";
import { Container } from "@/components/ui/Container";

/**
 * Brand philosophy statement, built to the layout the client supplied.
 *
 * The original mock drove its entrance with a GSAP ScrollTrigger timeline; the
 * same staggered reveal is done here with one IntersectionObserver and CSS
 * transition delays, so the page does not carry a 70 KB animation library for a
 * single section. Delays below mirror the order of that timeline.
 */

const POINTS = [
  {
    title: "Focus on excellence.",
    body: "We build reputation, not just reach.",
    path: (
      <>
        <path d="M6 3h12l3 5-9 13L3 8z" />
        <path d="M3 8h18M9 3l3 5 3-5M6 3l3 5-3 5M18 3l-3 5 3 5" />
      </>
    ),
  },
  {
    title: "Not just numbers.",
    body: "Every connection is chosen with intent.",
    path: (
      <>
        <circle cx="12" cy="12" r="9" />
        <circle cx="12" cy="12" r="5" />
        <circle cx="12" cy="12" r="1.2" fill="var(--color-gold-300)" />
        <path d="M12 3v3M21 12h-3" />
      </>
    ),
  },
];

const TAGLINES = ["Less noise.", "More value.", "Stronger brand.", "Lasting impact."];

/** Shorthand for the inline transition-delay the CSS reads. */
const delay = (seconds: number) => ({ "--bp-delay": `${seconds}s` }) as React.CSSProperties;

export function BrandPhilosophy() {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Revealing through the DOM node rather than state keeps this to a single
    // class flip with no re-render, and no server/client markup difference.
    const reveal = () => el.classList.add("bp-in");

    if (typeof IntersectionObserver === "undefined") {
      reveal();
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        reveal();
        observer.disconnect();
      },
      // Fires once the section's top passes 75% of the viewport, matching the
      // `start: "top 75%"` trigger in the supplied mock.
      { rootMargin: "0px 0px -25% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <section
      ref={ref}
      aria-labelledby="brand-philosophy-heading"
      className="bp bg-cream py-20 sm:py-24"
    >
      <Container>
        {/* Thesis: eyebrow on the left, the BRAND lockup on the right ------ */}
        <div className="grid items-end gap-6 lg:grid-cols-[240px_1fr]">
          <p
            className="bp-eyebrow bp-reveal font-semibold uppercase tracking-wide text-navy-900 lg:pb-[46px]"
            style={delay(0)}
          >
            If your <span className="text-gold-600">motive</span> is to create a
            <span
              className="bp-reveal bp-grow-x mt-[18px] hidden h-0.5 w-[46px] bg-gold-500 lg:block"
              style={delay(0.3)}
              aria-hidden
            />
          </p>

          <div className="mt-8 flex items-end justify-center lg:mt-0">
            <h2 id="brand-philosophy-heading" className="bp-headline font-display font-black text-navy-900">
              <span className="sr-only">Brand</span>

              <span className="bp-reveal" style={delay(0.3)} aria-hidden>
                B
              </span>
              <span className="bp-reveal" style={delay(0.36)} aria-hidden>
                R
              </span>

              {/* The "A" is replaced by the lamp / spotlight / chess-king rig. */}
              <span className="bp-a-slot" aria-hidden>
                <span className="bp-cord bp-reveal bp-grow-y" style={delay(0.4)} />
                <span className="bp-shade bp-reveal" style={delay(0.5)} />
                <span className="bp-bulb bp-reveal" style={delay(0.55)} />
                <span className="bp-cone bp-reveal bp-grow-y" style={delay(0.6)} />
                <span className="bp-pedestal bp-reveal" style={delay(0.75)} />
                <svg className="bp-king bp-reveal" viewBox="0 0 64 100" style={delay(0.8)}>
                  <rect x="28" y="2" width="8" height="10" rx="1" />
                  <rect x="24" y="10" width="16" height="4" rx="1" />
                  <path d="M20 20 C20 14 44 14 44 20 L40 46 L24 46 Z" />
                  <path d="M14 52 C14 46 50 46 50 52 L46 66 L18 66 Z" />
                  <path d="M10 72 C10 66 54 66 54 72 L50 90 L14 90 Z" />
                  <rect x="8" y="90" width="48" height="8" rx="2" />
                </svg>
              </span>

              <span className="bp-reveal" style={delay(0.42)} aria-hidden>
                N
              </span>
              <span className="bp-reveal" style={delay(0.48)} aria-hidden>
                D
              </span>
            </h2>
          </div>
        </div>

        {/* Creative + Quality, not Quantity ------------------------------- */}
        <div
          className="bp-reveal relative mt-12 rounded-[18px] border-[1.5px] border-gold-500 px-5 pb-[34px] pt-10 sm:mt-16 sm:px-14"
          style={delay(0.9)}
        >
          <span className="bp-panel-label text-sm font-semibold uppercase tracking-[0.2em] text-navy-900">
            Brand is all about
          </span>

          <div className="flex flex-wrap items-center justify-center gap-5 text-center">
            <span className="bp-word bp-reveal font-display font-extrabold text-navy-900" style={delay(1)}>
              Creative
            </span>
            <span
              className="bp-reveal bp-scale grid size-10 shrink-0 place-items-center rounded-full bg-navy-900"
              style={delay(1.05)}
              aria-hidden
            >
              <svg viewBox="0 0 24 24" className="size-[18px]">
                <path
                  d="M4 12l5 5L20 6"
                  stroke="var(--color-gold-300)"
                  strokeWidth="3"
                  fill="none"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </span>
            <span className="bp-word bp-reveal font-display font-extrabold text-gold-500" style={delay(1.08)}>
              Quality<span className="text-gold-500">,</span>
            </span>
          </div>

          {/* "Not" and the arrow lead the eye into "Quantity", so the whole
              claim reads as one line: Quality, not quantity. */}
          <div className="mt-3 flex flex-wrap items-center justify-center gap-x-4 gap-y-2">
            <span
              className="bp-reveal text-[0.95rem] font-semibold uppercase tracking-[0.125em] text-navy-900"
              style={delay(1.16)}
            >
              Not
            </span>
            <span className="bp-arrow bp-reveal bp-grow-x" style={delay(1.2)} aria-hidden />
            <span className="bp-word bp-reveal font-display font-extrabold text-gold-500" style={delay(1.3)}>
              Quantity<span className="text-gold-500">.</span>
            </span>
          </div>
        </div>

        {/* Supporting points ---------------------------------------------- */}
        <ul className="mt-12 flex flex-wrap items-center justify-center gap-7 sm:mt-14 sm:gap-12">
          {POINTS.map((point, i) => (
            <li key={point.title} className="contents">
              {i > 0 ? <span className="bp-hair hidden h-14 w-px sm:block" aria-hidden /> : null}
              <div
                className="bp-reveal flex max-w-[260px] items-center gap-4"
                style={delay(1.4 + i * 0.15)}
              >
                <span className="grid size-16 shrink-0 place-items-center rounded-full bg-navy-900 max-[380px]:size-13">
                  <svg
                    viewBox="0 0 24 24"
                    className="size-7 max-[380px]:size-[22px]"
                    fill="none"
                    stroke="var(--color-gold-500)"
                    strokeWidth="1.6"
                    aria-hidden
                  >
                    {point.path}
                  </svg>
                </span>
                <p className="text-[0.95rem] leading-snug text-navy-900">
                  <strong className="block border-b-[1.5px] border-gold-500 pb-0.5 font-bold">{point.title}</strong>
                  {point.body}
                </p>
              </div>
            </li>
          ))}
        </ul>

        {/* Tagline strip --------------------------------------------------- */}
        <div className="bp-footer-rule mx-auto mb-[22px] mt-12 w-[90%] sm:mt-[50px]" aria-hidden />
        <p className="flex flex-wrap items-center justify-center gap-x-4 gap-y-3 text-center text-[0.7rem] font-semibold uppercase tracking-[0.125em] text-navy-900 sm:gap-[22px] sm:text-xs">
          {TAGLINES.map((line, i) => (
            <span key={line} className="contents">
              {i > 0 ? (
                <span className="text-[color:var(--bp-hair)]" aria-hidden>
                  |
                </span>
              ) : null}
              <span className="bp-reveal" style={delay(1.7 + i * 0.08)}>
                {line}
              </span>
            </span>
          ))}
        </p>
      </Container>
    </section>
  );
}
