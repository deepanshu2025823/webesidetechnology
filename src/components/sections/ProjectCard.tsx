import Image from "next/image";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";

export type ProjectCardData = {
  id: string;
  title: string;
  slug: string;
  clientName: string;
  industry: string;
  summary: string;
  coverImage: string | null;
  services: { service: { title: string } }[];
};

export function ProjectCard({ project, priority = false }: { project: ProjectCardData; priority?: boolean }) {
  return (
    <Link
      href={`/portfolio/${project.slug}`}
      className="group flex h-full flex-col overflow-hidden rounded-2xl border border-navy-900/10 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-brand"
    >
      <div className="relative aspect-[16/10] overflow-hidden bg-navy-100">
        {project.coverImage ? (
          <Image
            src={project.coverImage}
            alt={project.title}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 380px"
            priority={priority}
            className="object-cover transition-transform duration-500 group-hover:scale-105"
          />
        ) : (
          <div className="grid h-full place-items-center bg-navy-900">
            <Image src="/brand/logo-mark-light.png" alt="" width={512} height={666} className="h-24 w-auto opacity-50" />
          </div>
        )}
        {project.industry ? (
          <span className="absolute left-4 top-4 rounded-full bg-navy-950/85 px-3 py-1 text-[11px] font-semibold uppercase tracking-wider text-gold-300 backdrop-blur">
            {project.industry}
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col p-6">
        {project.clientName ? (
          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-700">{project.clientName}</p>
        ) : null}
        <h3 className="mt-2 text-lg font-semibold text-navy-900 transition-colors group-hover:text-gold-800">
          {project.title}
        </h3>
        <p className="mt-2 flex-1 text-sm leading-relaxed text-slate-600">{project.summary}</p>

        {project.services.length ? (
          <ul className="mt-4 flex flex-wrap gap-2">
            {project.services.slice(0, 3).map((s) => (
              <li
                key={s.service.title}
                className="rounded-full bg-navy-50 px-3 py-1 text-[11px] font-medium text-navy-700"
              >
                {s.service.title}
              </li>
            ))}
          </ul>
        ) : null}

        <span className="mt-5 inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 group-hover:text-gold-700">
          View case study
          <ArrowUpRight className="size-4 transition-transform group-hover:translate-x-0.5 group-hover:-translate-y-0.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
