"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Image from "next/image";
import { ChevronLeft, ChevronRight, ExternalLink, Play, X } from "lucide-react";
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
 * Cards are reel-shaped by default — a 9:16 tile matching how Shorts and Reels
 * are actually filmed, so the poster fills the frame instead of sitting
 * letterboxed inside a landscape box. Admin can switch the whole strip to 16:9
 * for landscape footage.
 *
 * Nothing embeds until a card is clicked. Each tile is a poster image with a
 * play button, and only then does the player mount — six autoplaying YouTube
 * embeds would otherwise cost several megabytes and wreck the page's Core Web
 * Vitals before anyone pressed play. Playback opens in a lightbox rather than
 * inside the tile, which on a desktop row is only a couple of hundred pixels
 * wide; the lightbox also carries a link out to the video's own page.
 *
 * The track is a scroll-snap row rather than a JS carousel, so it is swipeable
 * on touch, keyboard-scrollable, and degrades to a plain scroller without JS.
 */
export function VideoCarousel({
  items,
  title,
  subtitle,
  perRow,
  aspect = "REEL",
}: {
  items: VideoItem[];
  title: string;
  subtitle?: string;
  perRow: number;
  aspect?: string;
}) {
  const track = useRef<HTMLUListElement>(null);
  const [playing, setPlaying] = useState<VideoItem | null>(null);
  const [atStart, setAtStart] = useState(true);
  const [atEnd, setAtEnd] = useState(false);

  const columns = Math.min(6, Math.max(1, perRow));
  const reel = aspect !== "WIDE";

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
                "min-w-0 shrink-0 snap-start",
                // A portrait card is tall, so it takes less width than a
                // landscape one at the same screen size.
                reel ? "basis-[62%] sm:basis-[36%]" : "basis-[85%] sm:basis-[48%]",
                BASIS[columns] ?? BASIS[3],
              )}
            >
              <VideoCard item={item} reel={reel} onPlay={() => setPlaying(item)} />
            </li>
          ))}
        </ul>
      </Container>

      {playing ? <Lightbox item={playing} reel={reel} onClose={() => setPlaying(null)} /> : null}
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

function VideoCard({ item, reel, onPlay }: { item: VideoItem; reel: boolean; onPlay: () => void }) {
  const video = parseVideo(item.url);

  // A custom thumbnail always wins. Otherwise a reel asks for the portrait
  // still first and drops back to the 4:3 one if the platform has none.
  const preferred = item.thumbnail || (reel && video?.portraitPoster) || video?.poster || "";
  const [poster, setPoster] = useState(preferred);

  // A different video in the same slot needs its own poster, and the fallback
  // from a previous render must not stick.
  const [seenPreferred, setSeenPreferred] = useState(preferred);
  if (seenPreferred !== preferred) {
    setSeenPreferred(preferred);
    setPoster(preferred);
  }

  if (!video) return null;
  const label = item.title || "Watch the video";

  return (
    <figure className="group overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm transition-shadow hover:shadow-brand">
      <button
        type="button"
        onClick={onPlay}
        aria-label={`Play ${label}`}
        className={cn("group/play relative block w-full bg-navy-950", reel ? "aspect-[9/16]" : "aspect-video")}
      >
        {poster ? (
          <Image
            src={poster}
            alt=""
            fill
            sizes={reel ? "(max-width: 640px) 62vw, (max-width: 1024px) 36vw, 25vw" : "(max-width: 640px) 85vw, (max-width: 1024px) 48vw, 33vw"}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
            unoptimized={poster.startsWith("http")}
            onError={() => setPoster(video.poster && poster !== video.poster ? video.poster : "")}
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

/**
 * Full-screen player. A reel is only as wide as its height allows, so the frame
 * is sized from the viewport height and stays portrait on a desktop monitor
 * instead of stretching to the width of the screen.
 */
function Lightbox({ item, reel, onClose }: { item: VideoItem; reel: boolean; onClose: () => void }) {
  const video = parseVideo(item.url);
  const closeRef = useRef<HTMLButtonElement>(null);

  const stop = useCallback((event: React.MouseEvent) => event.stopPropagation(), []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);

    // The page behind must not scroll under the overlay.
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [onClose]);

  if (!video) return null;
  const label = item.title || "Video";

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={label}
      onClick={onClose}
      className="fixed inset-0 z-[70] flex items-center justify-center bg-navy-950/90 p-4 backdrop-blur-sm"
    >
      <div onClick={stop} className="flex w-full max-w-5xl flex-col items-center gap-4">
        {/*
          A reel is sized from the viewport height and lets its width follow the
          9:16 ratio, so it stays portrait on a wide monitor. The width has to be
          `auto` for that — hence the inline style rather than utility classes,
          which would put `w-full` and `w-auto` in the same cascade and leave
          which one wins to chance.
        */}
        <div
          className={cn("overflow-hidden rounded-2xl bg-black shadow-brand", reel ? "mx-auto" : "aspect-video w-full")}
          style={reel ? { height: "min(78dvh, 46rem)", width: "auto", aspectRatio: "9 / 16", maxWidth: "100%" } : undefined}
        >
          {video.kind === "file" ? (
            <video src={video.embedUrl} controls autoPlay playsInline className="size-full object-contain">
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
          )}
        </div>

        <div className="flex w-full max-w-2xl flex-wrap items-center justify-center gap-3 text-center">
          {item.title ? <p className="w-full font-display text-lg text-white">{item.title}</p> : null}

          <a
            href={item.url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2 text-sm font-medium text-white transition-colors hover:border-gold-400 hover:text-gold-300"
          >
            <ExternalLink className="size-4" aria-hidden />
            Open in a new tab
          </a>

          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            className="inline-flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold text-navy-900 transition-colors hover:bg-gold-100"
          >
            <X className="size-4" aria-hidden />
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
