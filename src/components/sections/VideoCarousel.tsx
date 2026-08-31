"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, Play } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { parseVideo } from "@/lib/video";
import { cn } from "@/lib/utils";

export type VideoItem = {
  id: string;
  title: string;
  description: string | null;
  url: string;
  thumbnail: string;
};

/** Tailwind needs whole class names, so the per-row widths are written out. */
const BASIS: Record<number, string> = {
  1: "lg:basis-full",
  2: "lg:basis-1/2",
  3: "lg:basis-1/3",
  4: "lg:basis-1/4",
  5: "lg:basis-1/5",
  6: "lg:basis-1/6",
};

/**
 * Home-page video strip.
 *
 * Nothing embeds until a card is clicked: each tile is a poster image with a
 * play button, and only then is the iframe or <video> mounted. Six autoplaying
 * YouTube embeds would otherwise cost several megabytes and wreck the page's
 * Core Web Vitals before anyone presses play.
 *
 * The track is a scroll-snap row rather than a JS carousel, so it is swipeable
 * on touch, keyboard-scrollable, and degrades to a plain scroller without JS.
 */
export function VideoCarousel({
  items,
  title,
  subtitle,
  perRow,
}: {
  items: VideoItem[];
  title: string;
  subtitle?: string;
  perRow: number;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [playing, setPlaying] = useState<string | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const columns = Math.min(6, Math.max(1, perRow));

  // Arrows hide themselves at the ends rather than sitting there inert.
  useEffect(() => {
    const el = track.current;
    if (!el) return;

    const update = () => {
      setAtStart(el.scrollLeft <= 4);
      setAtEnd(el.scrollLeft + el.clientWidth >= el.scrollWidth - 4);
    };

    update();
    el.addEventListener("scroll", update, { passive: true });
    window.addEventListener("resize", update);
    return () => {
      el.removeEventListener("scroll", update);
      window.removeEventListener("resize", update);
    };
  }, [items.length]);

  if (!items.length) return null;

  const scrollBy = (direction: 1 | -1) => {
    const el = track.current;
    if (!el) return;
    el.scrollBy({ left: direction * (el.clientWidth / columns) * Math.max(1, columns - 1), behavior: "smooth" });
  };

  // One card per row means there is nothing to scroll past.
  const scrollable = items.length > columns;

  return (
    <section className="bg-cream py-16 sm:py-20">
      <Container size="wide">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <SectionHeading eyebrow="Showreel" title={title} description={subtitle} />

          {scrollable ? (
            <div className="hidden shrink-0 gap-2 lg:flex">
              <ArrowButton direction="left" disabled={atStart} onClick={() => scrollBy(-1)} />
              <ArrowButton direction="right" disabled={atEnd} onClick={() => scrollBy(1)} />
            </div>
          ) : null}
        </div>

        <ul
          ref={track}
          className={cn(
            "scroll-slim mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-4",
            !scrollable && "lg:overflow-visible",
          )}
        >
          {items.map((item) => (
            <li
              key={item.id}
              className={cn(
                "min-w-0 shrink-0 basis-[85%] snap-start sm:basis-[48%]",
                BASIS[columns] ?? BASIS[3],
              )}
            >
              <VideoCard item={item} isPlaying={playing === item.id} onPlay={() => setPlaying(item.id)} />
            </li>
          ))}
        </ul>
      </Container>
    </section>
  );
}

function ArrowButton({
  direction,
  disabled,
  onClick,
}: {
  direction: "left" | "right";
  disabled: boolean;
  onClick: () => void;
}) {
  const Icon = direction === "left" ? ChevronLeft : ChevronRight;
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-label={direction === "left" ? "Previous videos" : "Next videos"}
      className="grid size-11 place-items-center rounded-full border border-navy-900/15 bg-white text-navy-900 transition-colors hover:border-gold-500 hover:bg-gold-50 disabled:opacity-35 disabled:hover:border-navy-900/15 disabled:hover:bg-white"
    >
      <Icon className="size-5" aria-hidden />
    </button>
  );
}

function VideoCard({ item, isPlaying, onPlay }: { item: VideoItem; isPlaying: boolean; onPlay: () => void }) {
  const video = parseVideo(item.url);
  if (!video) return null;

  const poster = item.thumbnail || video.poster;
  const label = item.title || "Watch the video";

  return (
    <figure className="group overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm transition-shadow hover:shadow-brand">
      <div className="relative aspect-video bg-navy-950">
        {isPlaying ? (
          video.kind === "file" ? (
            <video src={video.embedUrl} controls autoPlay playsInline className="size-full object-cover">
              Your browser cannot play this video.
            </video>
          ) : (
            <iframe
              src={video.embedUrl}
              title={label}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
              className="size-full"
            />
          )
        ) : (
          <button type="button" onClick={onPlay} className="group/play size-full" aria-label={`Play ${label}`}>
            {poster ? (
              <Image
                src={poster}
                alt=""
                fill
                sizes="(max-width: 640px) 85vw, (max-width: 1024px) 48vw, 33vw"
                className="object-cover transition-transform duration-500 group-hover:scale-105"
                unoptimized={poster.startsWith("http")}
              />
            ) : null}

            <span aria-hidden className="absolute inset-0 bg-gradient-to-t from-navy-950/70 via-transparent to-transparent" />
            <span
              aria-hidden
              className="absolute left-1/2 top-1/2 grid size-16 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-gold-600 text-navy-950 shadow-gold transition-transform duration-300 group-hover/play:scale-110"
            >
              <Play className="ml-0.5 size-6 fill-current" />
            </span>
          </button>
        )}
      </div>

      {item.title || item.description ? (
        <figcaption className="p-5">
          {item.title ? <p className="font-display text-lg text-navy-900">{item.title}</p> : null}
          {item.description ? (
            <p className="mt-1.5 line-clamp-3 text-sm text-navy-900/60">{item.description}</p>
          ) : null}
        </figcaption>
      ) : null}
    </figure>
  );
}
