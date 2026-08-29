import Link from "next/link";
import Image from "next/image";
import { ChevronRight } from "lucide-react";
import { Container } from "@/components/ui/Container";

export type Crumb = { name: string; path: string };

export function PageHero({
  eyebrow,
  title,
  description,
  crumbs = [],
  image,
}: {
  eyebrow?: string;
  title: string;
  description?: string;
  crumbs?: Crumb[];
  image?: string | null;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-navy-950 py-16 sm:py-20">
      {image ? (
        <>
          <Image src={image} alt="" fill priority className="-z-20 object-cover opacity-25" sizes="100vw" />
          <div aria-hidden className="absolute inset-0 -z-10 bg-navy-950/70" />
        </>
      ) : (
        <div
          aria-hidden
          className="absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(55% 70% at 82% 8%, rgba(181,135,38,0.26), transparent 62%), radial-gradient(45% 60% at 5% 95%, rgba(36,66,188,0.32), transparent 60%)",
          }}
        />
      )}

      <Container size="wide">
        {crumbs.length ? (
          <nav aria-label="Breadcrumb">
            <ol className="flex flex-wrap items-center gap-1 text-xs text-navy-300">
              <li>
                <Link href="/" className="transition-colors hover:text-gold-300">
                  Home
                </Link>
              </li>
              {crumbs.map((crumb, i) => (
                <li key={crumb.path} className="flex items-center gap-1">
                  <ChevronRight className="size-3.5 text-navy-500" aria-hidden />
                  {i === crumbs.length - 1 ? (
                    <span className="text-gold-300">{crumb.name}</span>
                  ) : (
                    <Link href={crumb.path} className="transition-colors hover:text-gold-300">
                      {crumb.name}
                    </Link>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        ) : null}

        <div className="mt-6 max-w-3xl">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-gold-400">{eyebrow}</p>
          ) : null}
          <h1 className="mt-3 text-3xl leading-tight text-white sm:text-4xl lg:text-[2.9rem]">{title}</h1>
          {description ? <p className="mt-5 text-base leading-relaxed text-navy-200">{description}</p> : null}
        </div>
      </Container>
    </section>
  );
}
