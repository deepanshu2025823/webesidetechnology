import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { savePrActivity, savePrPitch } from "@/app/admin/actions/campaigns";
import { Badge, Card, EmptyState, PageHeader, inputClass } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export default async function PrPage() {
  const session = await requireModule("campaigns");

  const [activities, clients, owners, contacts] = await Promise.all([
    prisma.prActivity.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        owner: { select: { name: true } },
        pitches: { orderBy: { pitchedAt: "desc" }, include: { mediaContact: { select: { name: true, publication: true } } } },
      },
    }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.mediaContact.findMany({ orderBy: { name: "asc" } }),
  ]);

  const editable = canEdit(session.role, "campaigns");
  const placements = activities.reduce((sum, a) => sum + a.pitches.filter((p) => p.publishedUrl).length, 0);

  return (
    <>
      <PageHeader
        title="PR activities"
        description={`${activities.length} campaigns · ${placements} placements tracked.`}
      />

      {editable ? (
        <Card title="New PR activity" className="mb-6">
          <form
            action={async (formData: FormData) => {
              "use server";
              await savePrActivity({}, formData);
            }}
            className="grid gap-3 sm:grid-cols-12"
          >
            <select name="clientId" required defaultValue="" className={`${inputClass} sm:col-span-3`} aria-label="Client">
              <option value="">Select a client</option>
              {clients.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <input name="objective" required placeholder="PR objective" className={`${inputClass} sm:col-span-4`} />
            <input name="storyTitle" placeholder="Story angle" className={`${inputClass} sm:col-span-3`} />
            <select name="ownerId" defaultValue="" className={`${inputClass} sm:col-span-2`} aria-label="Owner">
              <option value="">Me</option>
              {owners.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
            <button
              type="submit"
              className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-12"
            >
              Add activity
            </button>
          </form>
        </Card>
      ) : null}

      {activities.length === 0 ? (
        <EmptyState title="No PR activities" description="Track objectives, media lists, pitches and coverage here." />
      ) : (
        <ul className="space-y-4">
          {activities.map((activity) => (
            <li key={activity.id} className="rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-navy-900">{activity.objective}</p>
                  <p className="text-xs text-slate-500">
                    <Link href={`/admin/clients/${activity.client.id}`} className="hover:text-gold-700">
                      {activity.client.name}
                    </Link>
                    {activity.storyTitle ? ` · ${activity.storyTitle}` : ""}
                    {activity.owner ? ` · ${activity.owner.name}` : ""}
                  </p>
                </div>
                <Badge tone={activity.stage === "PUBLISHED" || activity.stage === "REPORTED" ? "success" : "neutral"}>
                  {pretty(activity.stage)}
                </Badge>
              </div>

              {activity.pitches.length ? (
                <ul className="mt-4 divide-y divide-navy-900/5 border-t border-navy-900/5 pt-2">
                  {activity.pitches.map((pitch) => (
                    <li key={pitch.id} className="flex flex-wrap items-center gap-x-4 gap-y-1 py-2 text-sm">
                      <span className="font-medium text-navy-900">
                        {pitch.publication || pitch.mediaContact?.publication || "Publication"}
                      </span>
                      {pitch.mediaContact ? (
                        <span className="text-xs text-slate-500">{pitch.mediaContact.name}</span>
                      ) : null}
                      {pitch.publishedUrl ? (
                        <a
                          href={pitch.publishedUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-gold-700 hover:underline"
                        >
                          View coverage
                        </a>
                      ) : null}
                      {pitch.reach ? (
                        <span className="text-xs text-slate-500">reach {pitch.reach.toLocaleString("en-IN")}</span>
                      ) : null}
                      <span className="ml-auto text-xs text-slate-400">
                        {pitch.publishedAt ? formatDate(pitch.publishedAt) : pitch.pitchedAt ? `pitched ${formatDate(pitch.pitchedAt)}` : ""}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {editable ? (
                <form
                  action={savePrPitch.bind(null, activity.id)}
                  className="mt-4 grid gap-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4 sm:grid-cols-12"
                >
                  <select name="mediaContactId" defaultValue="" className={`${inputClass} sm:col-span-3`} aria-label="Journalist">
                    <option value="">Journalist (optional)</option>
                    {contacts.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name} — {c.publication}
                      </option>
                    ))}
                  </select>
                  <input name="publication" placeholder="Publication" className={`${inputClass} sm:col-span-3`} />
                  <input name="publishedUrl" placeholder="Coverage URL" className={`${inputClass} sm:col-span-3`} />
                  <input name="reach" type="number" min={0} placeholder="Reach" className={`${inputClass} sm:col-span-1`} />
                  <input name="publishedAt" type="date" className={`${inputClass} sm:col-span-2`} aria-label="Published date" />
                  <button
                    type="submit"
                    className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-12"
                  >
                    Log pitch / coverage
                  </button>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
