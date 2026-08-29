import Link from "next/link";
import { cn } from "@/lib/utils";

type Variant = "primary" | "outline" | "ghost" | "light";
type Size = "sm" | "md" | "lg";

const base =
  "inline-flex items-center justify-center gap-2 rounded-full font-semibold transition-all duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60";

const variants: Record<Variant, string> = {
  primary:
    "bg-gold-600 text-navy-950 shadow-gold hover:bg-gold-500 hover:-translate-y-0.5 active:translate-y-0",
  outline:
    "border border-navy-900/20 text-navy-900 hover:border-gold-500 hover:bg-gold-50 hover:text-gold-800",
  ghost: "text-navy-800 hover:bg-navy-50",
  light: "border border-white/25 bg-white/5 text-white backdrop-blur hover:border-gold-400 hover:bg-white/10",
};

const sizes: Record<Size, string> = {
  sm: "px-4 py-2 text-sm",
  md: "px-6 py-3 text-sm",
  lg: "px-8 py-4 text-base",
};

export function buttonClass(variant: Variant = "primary", size: Size = "md", className?: string) {
  return cn(base, variants[variant], sizes[size], className);
}

export function ButtonLink({
  href,
  variant = "primary",
  size = "md",
  className,
  children,
  ...rest
}: React.ComponentProps<typeof Link> & { variant?: Variant; size?: Size }) {
  const external = typeof href === "string" && /^https?:|^mailto:|^tel:/.test(href);

  if (external) {
    return (
      <a
        href={href as string}
        className={buttonClass(variant, size, className)}
        target={href.startsWith("http") ? "_blank" : undefined}
        rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
      >
        {children}
      </a>
    );
  }

  return (
    <Link href={href} className={buttonClass(variant, size, className)} {...rest}>
      {children}
    </Link>
  );
}

export function Button({
  variant = "primary",
  size = "md",
  className,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; size?: Size }) {
  return <button className={buttonClass(variant, size, className)} {...rest} />;
}
