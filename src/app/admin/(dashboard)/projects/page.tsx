import Link from "next/link";
import Image from "next/image";
import { ExternalLink, Pencil, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { deleteProject } from "@/app/admin/actions/content";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { DeleteRowButton } from "@/components/admin/DeleteRowButton";
import { formatDate } from "@/lib/utils";

export default async function ProjectsAdminPage() {
  const projects = await prisma.project.findMany({ orderBy: [{ order: "asc" }, { createdAt: "desc" }] });

  return (
    <>
      <PageHeader
        title="Portfolio"
        description="Case studies shown on the portfolio page and linked from service pages."
        actions={
          <Link
            href="/admin/projects/new"
            className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Plus className="size-4" aria-hidden /> Add case study
          </Link>
        }
      />

      {projects.length === 0 ? (
        <EmptyState
          title="No case studies yet"
          description="Publish your first project to fill the portfolio page."
          action={
            <Link href="/admin/projects/new" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white">
              Add a case study
            </Link>
          }
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Project</th>
                  <th className="px-5 py-3 font-medium">Client</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Delivered</th>
                  <th className="px-5 py-3 text-right font-medium">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {projects.map((project) => (
                  <tr key={project.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="relative size-11 shrink-0 overflow-hidden rounded-lg bg-slate-100">
                          {project.coverImage ? (
                            <Image src={project.coverImage} alt="" fill sizes="44px" className="object-cover" />
                          ) : null}
                        </span>
                        <div className="min-w-0">
                          <Link href={`/admin/projects/${project.id}`} className="font-medium text-navy-900 hover:text-gold-700">
                            {project.title}
                          </Link>
                          <p className="truncate text-xs text-slate-500">/portfolio/{project.slug}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-slate-600">{project.clientName || "—"}</td>
                    <td className="px-5 py-3.5">
                      <div className="flex flex-wrap gap-1">
                        <Badge tone={project.status === "PUBLISHED" ? "success" : "muted"}>
                          {project.status.toLowerCase()}
                        </Badge>
                        {project.isFeatured ? <Badge tone="neutral">Featured</Badge> : null}
                      </div>
                    </td>
                    <td className="px-5 py-3.5 text-xs text-slate-500">
                      {project.completedAt ? formatDate(project.completedAt, { month: "short", year: "numeric" }) : "—"}
                    </td>
                    <td className="px-5 py-3.5 text-right">
                      <div className="inline-flex gap-1">
                        <Link
                          href={`/portfolio/${project.slug}`}
                          target="_blank"
                          className="rounded-lg p-2 text-slate-500 hover:bg-navy-50 hover:text-navy-900"
                          aria-label="View live"
                        >
                          <ExternalLink className="size-4" />
                        </Link>
                        <Link
                          href={`/admin/projects/${project.id}`}
                          className="rounded-lg p-2 text-slate-500 hover:bg-navy-50 hover:text-navy-900"
                          aria-label="Edit"
                        >
                          <Pencil className="size-4" />
                        </Link>
                        <DeleteRowButton
                          label={project.title}
                          action={async () => {
                            "use server";
                            await deleteProject(project.id);
                          }}
                        />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </>
  );
}
