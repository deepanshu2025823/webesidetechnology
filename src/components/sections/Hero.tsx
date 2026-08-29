"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { ArrowRight, Sparkles } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type Slide = {
  id: string;
  eyebrow: string;
  title: string;
  subtitle: string;
  image: string | null;
  ctaLabel: string;
  ctaUrl: string;
  altLabel: string;
  altUrl: string;
};

export function Hero({ slides, stats }: { slides: Slide[]; stats: { label: string; value: string; suffix: string }[] }) {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    if (slides.length < 2) return;
    const id = setInterval(() => setIndex((i) => (i + 1) % slides.length), 7000);
    return () => clearInterval(id);
  }, [slides.length]);

  if (!slides.length) return null;
  const slide = slides[index];

  return (
    <section className="relative isolate overflow-hidden bg-navy-950">
      {/* Ambient gold wash + grid, kept behind the content */}
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-70"
        style={{
          background:
            "radial-gradient(60% 55% at 78% 12%, rgba(181,135,38,0.30), transparent 60%), radial-gradient(48% 48% at 8% 88%, rgba(36,66,188,0.35), transparent 62%)",
        }}
      />
      <div
        aria-hidden
        className="absolute inset-0 -z-10 opacity-[0.06]"
        style={{
          backgroundImage:
            "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
          backgroundSize: "64px 64px",
        }}
      />

      <Container size="wide">
        <div className="grid items-center gap-14 py-20 lg:grid-cols-2 lg:gap-16 lg:py-28">
          <div key={slide.id} className="animate-rise">
            {slide.eyebrow ? (
              <span className="inline-flex items-center gap-2 rounded-full border border-gold-500/30 bg-gold-500/10 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.18em] text-gold-300">
                <Sparkles className="size-3.5" aria-hidden />
                {slide.eyebrow}
              </span>
            ) : null}

            <h1 className="mt-6 text-4xl leading-[1.08] text-white sm:text-5xl lg:text-[3.4rem]">{slide.title}</h1>

            {slide.subtitle ? (
              <p className="mt-6 max-w-xl text-base leading-relaxed text-navy-200 sm:text-lg">{slide.subtitle}</p>
            ) : null}

            <div className="mt-9 flex flex-wrap gap-4">
              {slide.ctaLabel ? (
                <Link href={slide.ctaUrl || "/contact"} className={buttonClass("primary", "lg")}>
                  {slide.ctaLabel}
                  <ArrowRight className="size-4" aria-hidden />
                </Link>
              ) : null}
              {slide.altLabel ? (
                <Link href={slide.altUrl || "/services"} className={buttonClass("light", "lg")}>
                  {slide.altLabel}
                </Link>
              ) : null}
            </div>

            {slides.length > 1 ? (
              <div className="mt-10 flex gap-2" role="tablist" aria-label="Highlights">
                {slides.map((s, i) => (
                  <button
                    key={s.id}
                    type="button"
                    role="tab"
                    aria-selected={i === index}
                    aria-label={s.title}
                    onClick={() => setIndex(i)}
                    className={cn(
                      "h-1 rounded-full transition-all duration-300",
                      i === index ? "w-10 bg-gold-400" : "w-5 bg-white/25 hover:bg-white/50",
                    )}
                  />
                ))}
              </div>
            ) : null}
          </div>

          <div className="relative">
            <div className="relative aspect-[4/3.2] w-full overflow-hidden rounded-3xl border border-white/10 bg-navy-900 shadow-brand">
              {slide.image ? (
                <Image
                  src={slide.image}
                  alt={slide.title}
                  fill
                  priority
                  sizes="(max-width: 1024px) 100vw, 560px"
                  className="object-cover"
                />
              ) : (
                <div className="grid h-full place-items-center p-10">
                  <Image
                    src="/brand/logo-light.png"
                    alt=""
                    width={1024}
                    height={390}
                    priority
                    className="h-auto w-full max-w-[320px] opacity-90"
                  />
                </div>
              )}
              <div aria-hidden className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-navy-950/80 to-transparent" />
            </div>

            {stats.length ? (
              <div className="absolute -bottom-8 left-1/2 w-[92%] -translate-x-1/2 rounded-2xl border border-gold-500/25 bg-navy-900/95 p-5 shadow-brand backdrop-blur sm:-bottom-10 sm:w-[86%]">
                <dl className="grid grid-cols-3 divide-x divide-white/10">
                  {stats.slice(0, 3).map((stat) => (
                    <div key={stat.label} className="px-2 text-center">
                      <dt className="sr-only">{stat.label}</dt>
                      <dd className="font-display text-2xl text-gold-300 sm:text-3xl">
                        {stat.value}
                        <span className="text-gold-500">{stat.suffix}</span>
                      </dd>
                      <p className="mt-1 text-[11px] uppercase tracking-wider text-navy-300">{stat.label}</p>
                    </div>
                  ))}
                </dl>
              </div>
            ) : null}
          </div>
        </div>
      </Container>

      <div aria-hidden className="h-16 sm:h-20" />
    </section>
  );
}
