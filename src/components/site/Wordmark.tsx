import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/**
 * Compact header lockup: the crown mark beside a typeset wordmark.
 *
 * The supplied logo is a circular badge with the company name set inside it,
 * which becomes unreadable below about 90px. Pairing the mark with live type
 * keeps the brand legible in a 64–80px header while using the same colours.
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
        height={303}
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
