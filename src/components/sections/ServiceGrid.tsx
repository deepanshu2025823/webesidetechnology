import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import { Icon } from "@/components/ui/Icon";
import { cn } from "@/lib/utils";

export type ServiceCard = {
  id: string;
  title: string;
  slug: string;
  shortDescription: string;
  icon: string;
  category?: { name: string } | null;
};

export function ServiceGrid({ services, columns = 3 }: { services: ServiceCard[]; columns?: 2 | 3 | 4 }) {
  const grid = { 2: "sm:grid-cols-2", 3: "sm:grid-cols-2 lg:grid-cols-3", 4: "sm:grid-cols-2 lg:grid-cols-4" }[columns];

  return (
    <ul className={cn("grid gap-6", grid)}>
      {services.map((service) => (
        <li key={service.id}>
          <Link
            href={`/services/${service.slug}`}
            className="group flex h-full flex-col rounded-2xl border border-navy-900/10 bg-white p-7 transition-all duration-300 hover:-translate-y-1 hover:border-gold-400/60 hover:shadow-brand"
          >
            <span className="grid size-12 place-items-center rounded-xl bg-navy-900 text-gold-400 transition-colors group-hover:bg-gold-500 group-hover:text-navy-950">
              <Icon name={service.icon} className="size-6" />
            </span>

            {service.category ? (
              <span className="mt-5 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-700">
                {service.category.name}
              </span>
            ) : null}

            <h3 className="mt-2 text-lg font-semibold text-navy-900 transition-colors group-hover:text-gold-800">
              {service.title}
            </h3>

            <p className="mt-3 flex-1 text-sm leading-relaxed text-slate-600">{service.shortDescription}</p>

            <span className="mt-6 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 transition-colors group-hover:text-gold-700">
              Explore service
              <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}
