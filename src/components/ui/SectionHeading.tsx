import { cn } from "@/lib/utils";

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "left",
  tone = "light",
  className,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  align?: "left" | "center";
  tone?: "light" | "dark";
  className?: string;
}) {
  const centered = align === "center";

  return (
    <div className={cn("max-w-2xl", centered && "mx-auto text-center", className)}>
      {eyebrow ? (
        <p
          className={cn(
            "rule-gold text-xs font-semibold uppercase tracking-[0.22em]",
            centered && "rule-gold-center",
            tone === "dark" ? "text-gold-300" : "text-gold-700",
          )}
        >
          {eyebrow}
        </p>
      ) : null}
      <h2
        className={cn(
          "mt-5 text-3xl leading-tight sm:text-4xl",
          tone === "dark" ? "text-white" : "text-navy-900",
        )}
      >
        {title}
      </h2>
      {description ? (
        <p className={cn("mt-4 text-base leading-relaxed", tone === "dark" ? "text-navy-200" : "text-slate-600")}>
          {description}
        </p>
      ) : null}
    </div>
  );
}
