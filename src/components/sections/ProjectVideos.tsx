import { parseVideo } from "@/lib/video";
import { cn } from "@/lib/utils";

/**
 * The videos on a case study, played in place.
 *
 * Landscape films and portrait reels are grouped apart: a 9:16 reel next to a
 * 16:9 film in one row leaves either a sliver of a reel or a film towering
 * over its neighbour.
 */
export function ProjectVideos({ urls, title }: { urls: string[]; title: string }) {
  const videos = urls.map((url) => ({ url, video: parseVideo(url) })).filter((v) => v.video);
  if (!videos.length) return null;

  const wide = videos.filter((v) => !v.video!.vertical);
  const tall = videos.filter((v) => v.video!.vertical);

  const player = ({ video }: (typeof videos)[number], i: number) =>
    video!.kind === "file" ? (
      <video src={video!.inlineUrl} controls playsInline preload="metadata" className="size-full bg-black object-contain" />
    ) : (
      <iframe
        src={video!.inlineUrl}
        title={`${title} — video ${i + 1}`}
        loading="lazy"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
        allowFullScreen
        className="size-full"
      />
    );

  return (
    <div className="mt-12">
      <h2 className="text-2xl text-navy-900">Videos</h2>

      {wide.length ? (
        <ul className={cn("mt-5 grid gap-5", wide.length > 1 && "sm:grid-cols-2")}>
          {wide.map((v, i) => (
            <li key={v.url} className="aspect-video overflow-hidden rounded-2xl border border-navy-900/10 bg-navy-950">
              {player(v, i)}
            </li>
          ))}
        </ul>
      ) : null}

      {tall.length ? (
        <ul className="mt-5 grid grid-cols-1 gap-5 min-[480px]:grid-cols-2 lg:grid-cols-3">
          {tall.map((v, i) => (
            <li
              key={v.url}
              className={cn(
                "mx-auto w-full max-w-xs overflow-hidden rounded-2xl border border-navy-900/10 bg-white",
                // Instagram's embed carries its own header and caption around the reel.
                v.video!.kind === "instagram" ? "aspect-[9/14]" : "aspect-[9/16] bg-navy-950",
              )}
            >
              {player(v, wide.length + i)}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
