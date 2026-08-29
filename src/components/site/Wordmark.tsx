import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Compact header lockup: the crown mark beside a typeset wordmark.
 *
 * The supplied logo is a wide lockup carrying the name and the tagline, so at a
 * 64–80px header height its tagline is unreadable. Pairing the swash S with
 * live type keeps the brand legible at that size while using the same colours.
 */
export function Wordmark({
  mark,
  siteName,
  href = "/",
  tone = "dark",
  compact = false,
  className,
}: {
  mark: string;
  siteName: string;
  href?: string;
  /** "dark" for navy surfaces, "light" for white ones. */
  tone?: "dark" | "light";
  compact?: boolean;
  className?: string;
}) {
  const [first, ...rest] = siteName.split(" ");
  const second = rest.join(" ");

  return (
    <Link
      href={href}
      className={cn("group inline-flex items-center gap-3", className)}
      aria-label={`${siteName} — home`}
    >
      <Image
        src={mark}
        alt=""
        width={512}
        height={666}
        priority
        className={cn("w-auto object-contain transition-transform group-hover:scale-105", compact ? "h-7" : "h-9")}
      />
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "font-display font-semibold tracking-wide text-gold-400",
            compact ? "text-base" : "text-lg",
          )}
        >
          {first}
        </span>
        {second ? (
          <span
            className={cn(
              "mt-1 text-[0.6rem] font-medium uppercase tracking-[0.28em]",
              tone === "dark" ? "text-navy-200" : "text-navy-700",
            )}
          >
            {second}
          </span>
        ) : null}
      </span>
    </Link>
  );
}
