"use client";

import { useMemo, useState } from "react";
import { X } from "lucide-react";
import { ProjectCard, type ProjectCardData } from "@/components/sections/ProjectCard";
import { cn } from "@/lib/utils";

export type FilterableProject = ProjectCardData & {
  serviceSlugs: string[];
  tagSlugs: string[];
};

type Option = { slug: string; label: string };

/**
 * Portfolio grid with its filters.
 *
 * Filtering happens in the browser over the already-rendered list rather than
 * through the URL: the page is statically generated and every case study is on
 * it, so a round trip would buy nothing and cost the visitor a page load per
 * chip. Service and tag narrow together (a service *and* one of the tags), and
 * the tag row is multi-select because a case study usually carries several.
 *
 * The running total sits in one line under the chips rather than as a number on
 * each of them. A case study uses several services, so per-chip totals add up
 * to more than the number of case studies — accurate, and read as broken every
 * time. One figure that always matches the grid below it cannot be misread.
 */
export function PortfolioFilters({
  projects,
  services,
  tags,
}: {
  projects: FilterableProject[];
  services: Option[];
  tags: Option[];
}) {
  const [service, setService] = useState("");
  const [selectedTags, setSelectedTags] = useState<string[]>([]);

  const toggleTag = (slug: string) =>
    setSelectedTags((current) =>
      current.includes(slug) ? current.filter((s) => s !== slug) : [...current, slug],
    );

  const matchesService = (project: FilterableProject, slug: string) =>
    !slug || project.serviceSlugs.includes(slug);
  const matchesTags = (project: FilterableProject, slugs: string[]) =>
    !slugs.length || slugs.some((slug) => project.tagSlugs.includes(slug));

  const visible = useMemo(
    () => projects.filter((p) => matchesService(p, service) && matchesTags(p, selectedTags)),
    [projects, service, selectedTags],
  );

  /*
   * A chip is dead when pressing it would empty the grid. That is judged
   * against the *other* row's selection, never against the full list: with a
   * tag active, a service the remaining case studies do not use has nothing
   * behind it, and offering it promises results it cannot deliver.
   */
  const liveServices = useMemo(
    () => new Set(projects.filter((p) => matchesTags(p, selectedTags)).flatMap((p) => p.serviceSlugs)),
    [projects, selectedTags],
  );
  const liveTags = useMemo(
    () => new Set(projects.filter((p) => matchesService(p, service)).flatMap((p) => p.tagSlugs)),
    [projects, service],
  );

  const filtering = Boolean(service) || selectedTags.length > 0;
  const clear = () => {
    setService("");
    setSelectedTags([]);
  };

  return (
    <>
      {services.length > 1 || tags.length ? (
        <div className="mb-10 space-y-5">
          {services.length > 1 ? (
            <FilterRow label="Service">
              <Chip active={!service} onClick={() => setService("")}>
                All work
              </Chip>
              {services.map((option) => (
                <Chip
                  key={option.slug}
                  active={service === option.slug}
                  disabled={!liveServices.has(option.slug)}
                  onClick={() => setService(service === option.slug ? "" : option.slug)}
                >
                  {option.label}
                </Chip>
              ))}
            </FilterRow>
          ) : null}

          {/*
            One tag is still worth showing — it narrows the list on its own —
            whereas one service beside "All work" is a toggle that says nothing.
          */}
          {tags.length ? (
            <FilterRow label="Tag">
              {tags.map((option) => (
                <Chip
                  key={option.slug}
                  active={selectedTags.includes(option.slug)}
                  // An active tag stays pressable, or it could never be undone.
                  disabled={!liveTags.has(option.slug) && !selectedTags.includes(option.slug)}
                  onClick={() => toggleTag(option.slug)}
                >
                  {option.label}
                </Chip>
              ))}
            </FilterRow>
          ) : null}

          <div className="flex items-center gap-4">
            <p aria-live="polite" className="text-sm text-slate-600">
              Showing <span className="font-semibold text-navy-900">{visible.length}</span> of {projects.length} case
              stud{projects.length === 1 ? "y" : "ies"}
            </p>
            {filtering ? (
              <button
                type="button"
                onClick={clear}
                className="inline-flex items-center gap-1.5 text-sm font-semibold text-navy-900 underline-offset-4 hover:text-gold-700 hover:underline"
              >
                <X className="size-3.5" aria-hidden />
                Clear filters
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {visible.length ? (
        <ul className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {visible.map((project, i) => (
            <li key={project.id}>
              {/* The first row is above the fold; eager-load it for LCP. */}
              <ProjectCard project={project} priority={i < 3} />
            </li>
          ))}
        </ul>
      ) : (
        <div className="rounded-2xl border border-dashed border-navy-900/15 py-16 text-center">
          <p className="text-slate-600">No case studies match that combination yet.</p>
          <button
            type="button"
            onClick={clear}
            className="mt-4 rounded-full bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            Show everything
          </button>
        </div>
      )}
    </>
  );
}

function FilterRow({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-wrap items-center gap-2.5">
      <span className="mr-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-gold-700">{label}</span>
      {children}
    </div>
  );
}

function Chip({
  active,
  disabled = false,
  onClick,
  children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={active}
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full border px-4 py-2 text-sm font-medium transition-colors",
        active
          ? "border-navy-900 bg-navy-900 text-white"
          : "border-navy-900/15 bg-white text-navy-800 hover:border-gold-500 hover:bg-gold-50",
        disabled && "cursor-not-allowed border-navy-900/10 bg-white text-slate-400 hover:border-navy-900/10 hover:bg-white",
      )}
    >
      {children}
    </button>
  );
}
