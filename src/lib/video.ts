/**
 * Turns a pasted video link into something the carousel can render.
 *
 * Editors paste whatever the platform's share button gave them, so every common
 * YouTube and Vimeo shape is accepted rather than one canonical form. Anything
 * unrecognised is treated as a direct file and handed to a <video> element,
 * which is also the escape hatch for self-hosted MP4s.
 */

export type ParsedVideo =
  | { kind: "youtube"; id: string; embedUrl: string; poster: string }
  | { kind: "vimeo"; id: string; embedUrl: string; poster: string }
  | { kind: "file"; embedUrl: string; poster: string };

const YOUTUBE_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be", "www.youtu.be"]);
const VIMEO_HOSTS = new Set(["vimeo.com", "www.vimeo.com", "player.vimeo.com"]);

export function parseVideo(rawUrl: string): ParsedVideo | null {
  const raw = rawUrl?.trim();
  if (!raw) return null;

  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    return null;
  }

  const host = url.hostname.toLowerCase();

  if (YOUTUBE_HOSTS.has(host)) {
    // youtu.be/ID · /watch?v=ID · /embed/ID · /shorts/ID · /live/ID
    const id =
      host.endsWith("youtu.be")
        ? url.pathname.slice(1)
        : (url.searchParams.get("v") ?? url.pathname.replace(/^\/(embed|shorts|live|v)\//, ""));

    const clean = id.split("/")[0].split("?")[0];
    if (!clean) return null;

    return {
      kind: "youtube",
      id: clean,
      // `rel=0` keeps the end screen on our own channel rather than a competitor's.
      embedUrl: `https://www.youtube-nocookie.com/embed/${clean}?autoplay=1&rel=0`,
      poster: `https://i.ytimg.com/vi/${clean}/hqdefault.jpg`,
    };
  }

  if (VIMEO_HOSTS.has(host)) {
    const id = url.pathname.split("/").filter(Boolean).pop() ?? "";
    if (!/^\d+$/.test(id)) return null;
    return {
      kind: "vimeo",
      id,
      embedUrl: `https://player.vimeo.com/video/${id}?autoplay=1`,
      // Vimeo's poster needs an API call, so a custom thumbnail is preferred.
      poster: "",
    };
  }

  return { kind: "file", embedUrl: raw, poster: "" };
}
