import Link from "next/link";
import { ArrowRight, Check, PhoneCall } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { buttonClass } from "@/components/ui/Button";

/** Reassurances that answer the two objections people have at this point. */
const ASSURANCES = ["Reply within one working day", "No obligation, no pressure", "Fixed price before we start"];

/**
 * Closing call to action, on white.
 *
 * The pitch sits left and the two actions sit right in their own panel, so the
 * button is never competing with the headline for the same line of sight. Gold
 * is used only on the rule, the ticks and the primary button — on white it does
 * the accenting the old navy band needed a gradient for.
 */
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
    <section className="bg-white py-16 sm:py-24">
      <Container>
        <div className="relative isolate overflow-hidden rounded-3xl border border-navy-900/10 bg-white px-6 py-12 shadow-brand sm:px-12 sm:py-14">
          {/* Warm wash behind the action panel, kept well clear of the text. */}
          <div
            aria-hidden
            className="absolute -right-24 -top-24 -z-10 size-72 rounded-full"
            style={{ background: "radial-gradient(closest-side, rgba(201,154,43,0.16), transparent)" }}
          />
          <div aria-hidden className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-gold-600 via-gold-300 to-gold-600" />

          <div className="grid items-center gap-10 lg:grid-cols-[1.15fr_auto] lg:gap-16">
            <div>
              <p className="flex items-center gap-3 text-xs font-semibold uppercase tracking-[0.2em] text-gold-700">
                <span className="h-px w-8 bg-gold-500" aria-hidden />
                Let&rsquo;s talk
              </p>

              <h2 className="mt-4 max-w-xl text-3xl leading-tight text-navy-900 sm:text-4xl">{title}</h2>
              {subtitle ? <p className="mt-4 max-w-lg text-navy-900/65">{subtitle}</p> : null}

              <ul className="mt-7 flex flex-wrap gap-x-6 gap-y-2.5">
                {ASSURANCES.map((item) => (
                  <li key={item} className="flex items-center gap-2 text-sm text-navy-900/70">
                    <span className="grid size-4 shrink-0 place-items-center rounded-full bg-gold-100" aria-hidden>
                      <Check className="size-2.5 text-gold-700" strokeWidth={3.5} />
                    </span>
                    {item}
                  </li>
                ))}
              </ul>
            </div>

            <div className="w-full rounded-2xl border border-navy-900/10 bg-cream p-6 sm:p-7 lg:w-80">
              <Link href={buttonUrl || "/contact"} className={buttonClass("primary", "lg", "w-full")}>
                {buttonLabel}
                <ArrowRight className="size-4" aria-hidden />
              </Link>

              {phone ? (
                <>
                  <p className="my-4 flex items-center gap-3 text-xs uppercase tracking-widest text-navy-900/40">
                    <span className="h-px flex-1 bg-navy-900/10" aria-hidden />
                    or call
                    <span className="h-px flex-1 bg-navy-900/10" aria-hidden />
                  </p>
                  <a
                    href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                    className={buttonClass("outline", "lg", "w-full bg-white")}
                  >
                    <PhoneCall className="size-4" aria-hidden />
                    {phone}
                  </a>
                </>
              ) : null}
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
