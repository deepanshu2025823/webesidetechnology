import Image from "next/image";
import { Icon } from "@/components/ui/Icon";

type Step = { id: string; title: string; description: string; icon: string; image?: string };

/**
 * The "how we work" timeline, in one of two shapes.
 *
 * Give any step a picture and the whole row switches to picture mode — all four
 * cards get the same frame, and a step without its own picture falls back to its
 * icon inside that frame. Mixing a 56px icon circle with a photograph in the
 * same row leaves the titles on different baselines, so the choice is made for
 * the section rather than per card.
 */
export function ProcessTimeline({ steps }: { steps: Step[] }) {
  if (!steps.length) return null;

  const withPictures = steps.some((step) => Boolean(step.image));

  return (
    <ol className="relative grid gap-8 md:grid-cols-2 lg:grid-cols-4">
      {/* Connecting rule across the top of the cards on wide screens. Only the
          icon row is shallow enough for it to line up with the circles. */}
      {withPictures ? null : (
        <div
          aria-hidden
          className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent lg:block"
        />
      )}

      {steps.map((step, i) => (
        <li key={step.id} className="relative">
          {withPictures ? (
            <div className="relative overflow-hidden rounded-2xl border border-navy-900/10 bg-navy-50">
              <div className="relative aspect-[4/3]">
                {step.image ? (
                  <Image
                    src={step.image}
                    alt={step.title}
                    fill
                    sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 25vw"
                    className="object-cover"
                  />
                ) : (
                  <span className="grid size-full place-items-center text-gold-700">
                    <Icon name={step.icon} className="size-10" />
                  </span>
                )}
              </div>
              <span className="absolute left-3 top-3 grid size-7 place-items-center rounded-full bg-navy-900 text-xs font-bold text-gold-300">
                {i + 1}
              </span>
            </div>
          ) : (
            <div className="relative z-10 grid size-14 place-items-center rounded-full border border-gold-400/40 bg-white text-gold-700 shadow-sm">
              <Icon name={step.icon} className="size-6" />
              <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-navy-900 text-[11px] font-bold text-gold-300">
                {i + 1}
              </span>
            </div>
          )}

          <h3 className="mt-5 text-lg font-semibold text-navy-900">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
        </li>
      ))}
    </ol>
  );
}
