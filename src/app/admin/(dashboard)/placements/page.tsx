import Link from "next/link";
import { Building2 } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { PlacementBoard, type CandidateRow } from "@/components/admin/PlacementBoard";
import { cn } from "@/lib/utils";

type Search = { q?: string; source?: string; status?: string };

const SOURCES = [
  { id: "all", label: "Everyone" },
  { id: "ACADEMY", label: "Academy students" },
  { id: "EXTERNAL", label: "Outside applicants" },
] as const;

const strings = (value: unknown): string[] =>
  Array.isArray(value) ? value.map(String).filter(Boolean) : [];

/**
 * Candidate database and placement pipeline.
 *
 * The academy's own students and people who apply from outside sit in one list,
 * because they compete for the same openings; the source chips separate them
 * when that matters.
 */
export default async function PlacementsPage({ searchParams }: { searchParams: Promise<Search> }) {
  const session = await requireModule("placements");
  const { q, source: sourceRaw, status } = await searchParams;

  const term = q?.trim();
  const source = SOURCES.some((s) => s.id === sourceRaw) ? sourceRaw : "all";

  const [candidates, partners] = await Promise.all([
    prisma.candidate.findMany({
      where: {
        ...(source === "ACADEMY" || source === "EXTERNAL" ? { source } : {}),
        ...(status ? { status: status as never } : {}),
        ...(term
          ? {
              OR: [
                { name: { contains: term } },
                { email: { contains: term } },
                { phone: { contains: term } },
                { course: { contains: term } },
                { qualification: { contains: term } },
                { city: { contains: term } },
              ],
            }
          : {}),
      },
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 200,
      include: {
        applications: {
          orderBy: { sentAt: "desc" },
          include: { partner: { select: { name: true } } },
        },
      },
    }),
    prisma.placementPartner.findMany({
      where: { isActive: true },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const rows: CandidateRow[] = candidates.map((c) => ({
    id: c.id,
    name: c.name,
    email: c.email,
    phone: c.phone,
    city: c.city,
    source: c.source,
    course: c.course,
    batch: c.batch,
    qualification: c.qualification,
    skills: strings(c.skills),
    experienceYears: c.experienceYears,
    expectedCtc: c.expectedCtc,
    noticeDays: c.noticeDays,
    resumeUrl: c.resumeUrl,
    resumeName: c.resumeName,
    portfolioUrl: c.portfolioUrl,
    linkedinUrl: c.linkedinUrl,
    status: c.status,
    rating: c.rating,
    notes: c.notes,
    applications: c.applications.map((a) => ({
      id: a.id,
      role: a.role,
      stage: a.stage,
      partnerName: a.partner.name,
      interviewAt: a.interviewAt ? a.interviewAt.toISOString() : null,
      offerCtc: a.offerCtc,
    })),
  }));

  const placed = rows.filter((r) => r.status === "PLACED").length;
  const inProcess = rows.filter((r) => r.status === "IN_PROCESS").length;

  return (
    <>
      <PageHeader
        title="Placements"
        description={`${rows.length} candidate(s) · ${inProcess} in process · ${placed} placed. Academy students and outside applicants share one pipeline.`}
        actions={
          <Link
            href="/admin/placements/partners"
            className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
          >
            <Building2 className="size-4" aria-hidden /> Partners
          </Link>
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-3">
        <nav aria-label="Filter by source" className="flex flex-wrap gap-2">
          {SOURCES.map((s) => {
            const params = new URLSearchParams();
            if (term) params.set("q", term);
            if (s.id !== "all") params.set("source", s.id);
            const query = params.toString();
            return (
              <Link
                key={s.id}
                href={`/admin/placements${query ? `?${query}` : ""}`}
                aria-current={source === s.id ? "page" : undefined}
                className={cn(
                  "rounded-xl border px-4 py-2 text-sm font-medium transition-colors",
                  source === s.id
                    ? "border-navy-900 bg-navy-900 text-white"
                    : "border-navy-900/15 bg-white text-navy-800 hover:border-gold-500 hover:bg-gold-50",
                )}
              >
                {s.label}
              </Link>
            );
          })}
        </nav>

        <form action="/admin/placements" className="flex items-center gap-2">
          {source !== "all" ? <input type="hidden" name="source" value={source} /> : null}
          <input
            name="q"
            type="search"
            defaultValue={term}
            placeholder="Search name, email, course…"
            aria-label="Search candidates"
            className="rounded-xl border border-navy-900/15 px-3.5 py-2 text-sm"
          />
          <button type="submit" className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white">
            Search
          </button>
        </form>
      </div>

      <PlacementBoard candidates={rows} partners={partners} editable={canEdit(session.role, "placements")} />
    </>
  );
}
