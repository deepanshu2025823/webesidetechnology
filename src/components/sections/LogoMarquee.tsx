import Image from "next/image";
import { Container } from "@/components/ui/Container";

type Logo = { id: string; name: string; logo: string; websiteUrl: string };

/** Continuous client-logo strip; the list is duplicated so the loop is seamless. */
export function LogoMarquee({ logos, title }: { logos: Logo[]; title?: string }) {
  if (!logos.length) return null;
  const doubled = [...logos, ...logos];

  return (
    <section className="border-b border-navy-900/10 bg-cream py-12">
      <Container size="wide">
        {title ? (
          <p className="text-center text-xs font-semibold uppercase tracking-[0.22em] text-slate-500">{title}</p>
        ) : null}
        <div className="relative mt-8 overflow-hidden [mask-image:linear-gradient(to_right,transparent,black_8%,black_92%,transparent)]">
          <ul className="flex w-max animate-marquee items-center gap-14">
            {doubled.map((logo, i) => (
              <li key={`${logo.id}-${i}`} className="shrink-0">
                <Image
                  src={logo.logo}
                  alt={logo.name}
                  width={150}
                  height={56}
                  className="h-10 w-auto object-contain opacity-60 grayscale transition hover:opacity-100 hover:grayscale-0"
                />
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </section>
  );
}
