import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Plus } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { saveBacklink, saveKeyword, saveSeoReport, saveSeoTask } from "@/app/admin/actions/campaigns";
import { SeoTaskRow } from "@/components/admin/SeoTaskRow";
import { KeywordDeleteButton } from "@/components/admin/KeywordDeleteButton";
import { Badge, Card, PageHeader, inputClass } from "@/components/admin/ui";
import { cn, formatDate } from "@/lib/utils";

const CATEGORIES = ["TECHNICAL", "ON_PAGE", "OFF_PAGE", "LOCAL", "CONTENT"];
const PRIORITIES = ["LOW", "MEDIUM", "HIGH", "CRITICAL"];
const INTENTS = ["Informational", "Commercial", "Transactional", "Navigational"];
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export default async function SeoPlanPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModule("campaigns");
  const { id } = await params;

  const plan = await prisma.seoPlan.findUnique({
    where: { id },
    include: {
      client: { select: { id: true, name: true } },
      keywords: { orderBy: [{ priority: "desc" }, { term: "asc" }] },
      tasks: { orderBy: { status: "asc" }, include: { assignee: { select: { name: true } } } },
      backlinks: { orderBy: { acquiredAt: "desc" } },
      reports: { orderBy: { month: "desc" } },
    },
  });
  if (!plan) notFound();

  const assignees = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const editable = canEdit(session.role, "campaigns");
  const top3 = plan.keywords.filter((k) => k.currentPosition !== null && k.currentPosition <= 3).length;
  const top10 = plan.keywords.filter((k) => k.currentPosition !== null && k.currentPosition <= 10).length;

  const addKeyword = saveKeyword.bind(null, plan.id);
  const addTask = saveSeoTask.bind(null, plan.id);
  const addBacklink = saveBacklink.bind(null, plan.id);
  const addReport = saveSeoReport.bind(null, plan.id);

  return (
    <>
      <Link href="/admin/campaigns/seo" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All SEO plans
      </Link>

      <PageHeader
        title={`${plan.client.name} — SEO`}
        description={`${plan.keywords.length} keywords · ${top3} in top 3 · ${top10} in top 10${plan.website ? ` · ${plan.website}` : ""}`}
      />

      <div className="space-y-6">
        <Card title="Keyword map" description="Target URL, intent and where you rank today.">
          {editable ? (
            <form action={addKeyword} className="mb-5 grid gap-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4 sm:grid-cols-12">
              <input name="term" required placeholder="Keyword" className={`${inputClass} sm:col-span-3`} />
              <input name="targetUrl" placeholder="Target URL" className={`${inputClass} sm:col-span-3`} />
              <select name="priority" defaultValue="MEDIUM" className={`${inputClass} sm:col-span-2`} aria-label="Priority">
                {PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {pretty(p)}
                  </option>
                ))}
              </select>
              <select name="intent" defaultValue="Informational" className={`${inputClass} sm:col-span-2`} aria-label="Intent">
                {INTENTS.map((i) => (
                  <option key={i} value={i}>
                    {i}
                  </option>
                ))}
              </select>
              <input name="currentPosition" type="number" min={1} placeholder="Now" className={`${inputClass} sm:col-span-1`} />
              <input name="targetPosition" type="number" min={1} placeholder="Goal" className={`${inputClass} sm:col-span-1`} />
              <button
                type="submit"
                className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-12"
              >
                <Plus className="size-4" aria-hidden /> Add keyword
              </button>
            </form>
          ) : null}

          {plan.keywords.length ? (
            <div className="scroll-slim overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-navy-900/10 text-xs uppercase tracking-wide text-slate-500">
                  <tr>
                    <th className="py-2 font-medium">Keyword</th>
                    <th className="py-2 font-medium">Target</th>
                    <th className="py-2 font-medium">Priority</th>
                    <th className="py-2 font-medium">Intent</th>
                    <th className="py-2 text-center font-medium">Now</th>
                    <th className="py-2 text-center font-medium">Goal</th>
                    {editable ? <th className="py-2" /> : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-900/5">
                  {plan.keywords.map((k) => (
                    <tr key={k.id}>
                      <td className="py-2.5 font-medium text-navy-900">{k.term}</td>
                      <td className="max-w-48 truncate py-2.5 text-xs text-slate-500">{k.targetUrl || "—"}</td>
                      <td className="py-2.5">
                        <Badge tone={k.priority === "CRITICAL" || k.priority === "HIGH" ? "warn" : "neutral"}>
                          {pretty(k.priority)}
                        </Badge>
                      </td>
                      <td className="py-2.5 text-xs text-slate-500">{k.intent}</td>
                      <td className={cn("py-2.5 text-center", k.currentPosition && k.currentPosition <= 10 ? "font-medium text-emerald-700" : "text-slate-500")}>
                        {k.currentPosition ?? "—"}
                      </td>
                      <td className="py-2.5 text-center text-slate-500">{k.targetPosition ?? "—"}</td>
                      {editable ? (
                        <td className="py-2.5 text-right">
                          <KeywordDeleteButton id={k.id} label={k.term} />
                        </td>
                      ) : null}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-slate-500">No keywords mapped yet.</p>
          )}
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card title="Monthly task list" description="Technical, on-page, off-page, local and content work.">
            {editable ? (
              <form action={addTask} className="mb-4 grid gap-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4 sm:grid-cols-12">
                <input name="title" required placeholder="Task" className={`${inputClass} sm:col-span-6`} />
                <select name="category" defaultValue="ON_PAGE" className={`${inputClass} sm:col-span-3`} aria-label="Category">
                  {CATEGORIES.map((c) => (
                    <option key={c} value={c}>
                      {pretty(c)}
                    </option>
                  ))}
                </select>
                <select name="assigneeId" defaultValue="" className={`${inputClass} sm:col-span-3`} aria-label="Assignee">
                  <option value="">Assignee</option>
                  {assignees.map((a) => (
                    <option key={a.id} value={a.id}>
                      {a.name}
                    </option>
                  ))}
                </select>
                <button
                  type="submit"
                  className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-12"
                >
                  Add task
                </button>
              </form>
            ) : null}

            {plan.tasks.length ? (
              <ul className="divide-y divide-navy-900/5">
                {plan.tasks.map((t) => (
                  <SeoTaskRow
                    key={t.id}
                    task={{
                      id: t.id,
                      title: t.title,
                      category: t.category,
                      status: t.status,
                      assignee: t.assignee?.name ?? null,
                    }}
                    editable={editable}
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No tasks yet.</p>
            )}
          </Card>

          <Card title="Backlinks & outreach">
            {editable ? (
              <form action={addBacklink} className="mb-4 grid gap-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4">
                <input name="sourceUrl" required placeholder="Source URL" className={inputClass} />
                <div className="grid grid-cols-2 gap-3">
                  <input name="anchor" placeholder="Anchor text" className={inputClass} />
                  <input name="authority" type="number" min={0} max={100} placeholder="DA" className={inputClass} />
                </div>
                <button
                  type="submit"
                  className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
                >
                  Add backlink
                </button>
              </form>
            ) : null}

            {plan.backlinks.length ? (
              <ul className="divide-y divide-navy-900/5">
                {plan.backlinks.map((b) => (
                  <li key={b.id} className="py-2.5">
                    <p className="truncate text-sm text-navy-900">{b.sourceUrl}</p>
                    <p className="text-xs text-slate-500">
                      {b.anchor || "no anchor"} · DA {b.authority} · {pretty(b.status)}
                    </p>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-slate-500">No backlinks recorded.</p>
            )}
          </Card>
        </div>

        <Card title="Monthly reports">
          {editable ? (
            <form action={addReport} className="mb-5 grid gap-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4 sm:grid-cols-12">
              <input name="month" type="month" required className={`${inputClass} sm:col-span-3`} aria-label="Month" />
              <input name="organicTraffic" type="number" min={0} placeholder="Organic sessions" className={`${inputClass} sm:col-span-3`} />
              <input name="keywordsTop3" type="number" min={0} placeholder="Top 3" className={`${inputClass} sm:col-span-2`} />
              <input name="keywordsTop10" type="number" min={0} placeholder="Top 10" className={`${inputClass} sm:col-span-2`} />
              <button
                type="submit"
                className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-2"
              >
                Save
              </button>
            </form>
          ) : null}

          {plan.reports.length ? (
            <ul className="divide-y divide-navy-900/5">
              {plan.reports.map((r) => (
                <li key={r.id} className="flex flex-wrap items-center gap-x-6 gap-y-1 py-3 text-sm">
                  <span className="font-medium text-navy-900">{formatDate(r.month, { month: "long", year: "numeric" })}</span>
                  <span className="text-slate-600">
                    Traffic <strong className="text-navy-900">{r.organicTraffic.toLocaleString("en-IN")}</strong>
                  </span>
                  <span className="text-slate-600">
                    Top 3 <strong className="text-navy-900">{r.keywordsTop3}</strong>
                  </span>
                  <span className="text-slate-600">
                    Top 10 <strong className="text-navy-900">{r.keywordsTop10}</strong>
                  </span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No reports yet.</p>
          )}
        </Card>
      </div>
    </>
  );
}
