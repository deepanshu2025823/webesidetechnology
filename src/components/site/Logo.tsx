import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/utils";

/** Intrinsic size of the supplied wordmark lockup, used to keep the aspect ratio. */
const LOCKUP_WIDTH = 1024;
const LOCKUP_HEIGHT = 390;

/**
 * The full logo lockup, sized by height.
 *
 * Next compares the declared width/height ratio against the real file, so the
 * artwork's true dimensions are declared here and the visible size is set in
 * CSS. Passing display dimensions instead produces an aspect-ratio warning.
 *
 * If the client uploads a differently proportioned logo, pass its real
 * `intrinsic` dimensions along with it.
 */
export function Logo({
  src,
  siteName,
  className,
  priority = false,
  height = 64,
  intrinsic = { width: LOCKUP_WIDTH, height: LOCKUP_HEIGHT },
}: {
  src: string;
  siteName: string;
  className?: string;
  priority?: boolean;
  /** Rendered height in pixels; width follows the aspect ratio. */
  height?: number;
  intrinsic?: { width: number; height: number };
}) {
  return (
    <Link href="/" className={cn("inline-flex items-center", className)} aria-label={`${siteName} — home`}>
      <Image
        src={src}
        alt={siteName}
        width={intrinsic.width}
        height={intrinsic.height}
        priority={priority}
        className="object-contain"
        style={{ height, width: "auto" }}
      />
    </Link>
  );
}
