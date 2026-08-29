import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { createSeoPlan } from "@/app/admin/actions/campaigns";
import { EmptyState, PageHeader, inputClass } from "@/components/admin/ui";

export default async function SeoPlansPage() {
  const session = await requireModule("campaigns");

  const [plans, clients, projects] = await Promise.all([
    prisma.seoPlan.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        _count: { select: { keywords: true, tasks: true, backlinks: true } },
      },
    }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.clientProject.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const editable = canEdit(session.role, "campaigns");

  return (
    <>
      <PageHeader title="SEO plans" description="Keyword maps, monthly task lists, backlinks and reporting per client." />

      {editable ? (
        <form
          action={async (formData: FormData) => {
            "use server";
            await createSeoPlan({}, formData);
          }}
          className="mb-6 grid gap-3 rounded-xl border border-navy-900/10 bg-white p-4 shadow-sm sm:grid-cols-12"
        >
          <select name="clientId" required defaultValue="" className={`${inputClass} sm:col-span-4`} aria-label="Client">
            <option value="">Select a client</option>
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input name="website" placeholder="https://client-site.com" className={`${inputClass} sm:col-span-4`} />
          <select name="projectId" defaultValue="" className={`${inputClass} sm:col-span-2`} aria-label="Project">
            <option value="">No project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-2"
          >
            Create plan
          </button>
        </form>
      ) : null}

      {plans.length === 0 ? (
        <EmptyState title="No SEO plans yet" description="Create one per client website." />
      ) : (
        <ul className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {plans.map((plan) => (
            <li key={plan.id}>
              <Link
                href={`/admin/campaigns/seo/${plan.id}`}
                className="flex h-full flex-col rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm transition-all hover:-translate-y-0.5 hover:border-gold-400/60"
              >
                <p className="font-medium text-navy-900">{plan.client.name}</p>
                {plan.website ? <p className="truncate text-xs text-slate-500">{plan.website}</p> : null}
                <div className="mt-4 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-500">
                  <span>{plan._count.keywords} keywords</span>
                  <span>{plan._count.tasks} tasks</span>
                  <span>{plan._count.backlinks} backlinks</span>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
