import Link from "next/link";
import { ArrowRight, PhoneCall } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/Button";

export function CtaBand({
  title,
  subtitle,
  buttonLabel,
  buttonUrl,
  phone,
}: {
  title: string;
  subtitle?: string;
  buttonLabel: string;
  buttonUrl: string;
  phone?: string;
}) {
  return (
    <section className="relative isolate overflow-hidden bg-navy-900 py-16 sm:py-20">
      <div
        aria-hidden
        className="absolute inset-0 -z-10"
        style={{
          background:
            "radial-gradient(50% 120% at 50% 0%, rgba(181,135,38,0.28), transparent 65%)",
        }}
      />
      <Container>
        <div className="text-center">
          <h2 className="mx-auto max-w-2xl text-3xl leading-tight text-white sm:text-4xl">{title}</h2>
          {subtitle ? <p className="mx-auto mt-4 max-w-xl text-navy-200">{subtitle}</p> : null}

          <div className="mt-9 flex flex-wrap items-center justify-center gap-4">
            <Link href={buttonUrl || "/contact"} className={buttonClass("primary", "lg")}>
              {buttonLabel}
              <ArrowRight className="size-4" aria-hidden />
            </Link>
            {phone ? (
              <a href={`tel:${phone.replace(/[^\d+]/g, "")}`} className={buttonClass("light", "lg")}>
                <PhoneCall className="size-4" aria-hidden />
                {phone}
              </a>
            ) : null}
          </div>
        </div>
      </Container>
    </section>
  );
}
