import { Icon } from "@/components/ui/Icon";

type Step = { id: string; title: string; description: string; icon: string };

export function ProcessTimeline({ steps }: { steps: Step[] }) {
  if (!steps.length) return null;

  return (
    <ol className="relative grid gap-8 md:grid-cols-2 lg:grid-cols-4">
      {/* Connecting rule across the top of the cards on wide screens */}
      <div
        aria-hidden
        className="absolute left-0 right-0 top-7 hidden h-px bg-gradient-to-r from-transparent via-gold-400/50 to-transparent lg:block"
      />
      {steps.map((step, i) => (
        <li key={step.id} className="relative">
          <div className="relative z-10 grid size-14 place-items-center rounded-full border border-gold-400/40 bg-white text-gold-700 shadow-sm">
            <Icon name={step.icon} className="size-6" />
            <span className="absolute -right-1 -top-1 grid size-6 place-items-center rounded-full bg-navy-900 text-[11px] font-bold text-gold-300">
              {i + 1}
            </span>
          </div>
          <h3 className="mt-5 text-lg font-semibold text-navy-900">{step.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-slate-600">{step.description}</p>
        </li>
      ))}
    </ol>
  );
}
