import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Building2, Globe, Mail, Phone, UserPlus, Wallet } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { addLeadActivity, convertLeadToClient, updateLead } from "@/app/admin/actions/crm";
import { deleteEnquiry } from "@/app/admin/actions/content";
import { Badge, Card, PageHeader, inputClass } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

const STAGES = ["NEW", "CONTACTED", "QUALIFIED", "PROPOSAL", "WON", "LOST"];
const ACTIVITY_TYPES = ["NOTE", "CALL", "EMAIL", "MEETING", "WHATSAPP", "FOLLOW_UP"];

export default async function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModule("leads");
  const { id } = await params;

  const lead = await prisma.enquiry.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      client: { select: { id: true, name: true } },
      notes: { orderBy: { createdAt: "desc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!lead) notFound();

  if (!lead.isRead) await prisma.enquiry.update({ where: { id }, data: { isRead: true } });

  const owners = await prisma.user.findMany({
    where: { isActive: true },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const editable = canEdit(session.role, "leads");
  const canConvert = canEdit(session.role, "clients") && !lead.clientId;

  const save = updateLead.bind(null, id);
  const log = addLeadActivity.bind(null, id);
  const convert = convertLeadToClient.bind(null, id);
  const remove = deleteEnquiry.bind(null, id);

  const facts = [
    { icon: Mail, label: "Email", value: lead.email, href: `mailto:${lead.email}` },
    lead.phone && { icon: Phone, label: "Phone", value: lead.phone, href: `tel:${lead.phone}` },
    lead.company && { icon: Building2, label: "Company", value: lead.company },
    lead.budget && { icon: Wallet, label: "Budget", value: lead.budget },
    lead.pageUrl && { icon: Globe, label: "Came from", value: `${lead.source} · ${lead.pageUrl}` },
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href?: string }[];

  return (
    <>
      <Link href="/admin/leads" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All leads
      </Link>

      <PageHeader
        title={lead.name}
        description={`${lead.serviceInterest || "General enquiry"} · received ${formatDate(lead.createdAt, {
          day: "numeric",
          month: "long",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        })}`}
        actions={
          canConvert ? (
            <form action={convert}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
              >
                <UserPlus className="size-4" aria-hidden /> Convert to client
              </button>
            </form>
          ) : lead.client ? (
            <Link
              href={`/admin/clients/${lead.client.id}`}
              className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
            >
              <Building2 className="size-4" aria-hidden /> {lead.client.name}
            </Link>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card title="What they asked for">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-navy-800">{lead.message}</p>
          </Card>

          <Card title="Activity" description="Calls, emails and follow-ups on this lead.">
            {editable ? (
              <form action={log} className="mb-5 space-y-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <select name="type" defaultValue="CALL" className={inputClass} aria-label="Activity type">
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0) + t.slice(1).toLowerCase().replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  <div className="sm:col-span-2">
                    <input
                      name="dueAt"
                      type="date"
                      aria-label="Next follow-up date"
                      className={inputClass}
                    />
                  </div>
                </div>
                <textarea name="body" required rows={2} placeholder="What was discussed?" className={inputClass} />
                <button
                  type="submit"
                  className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
                >
                  Log activity
                </button>
              </form>
            ) : null}

            {lead.notes.length ? (
              <ol className="space-y-4">
                {lead.notes.map((n) => (
                  <li key={n.id} className="border-l-2 border-gold-400/50 pl-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{n.type.toLowerCase().replace("_", " ")}</Badge>
                      <span className="ml-auto text-xs text-slate-400">
                        {formatDate(n.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{n.body}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {n.author?.name ?? "Team"}
                      {n.dueAt ? ` · follow up ${formatDate(n.dueAt)}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">No activity logged yet.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Contact">
            <ul className="space-y-4">
              {facts.map(({ icon: Icon, label, value, href }) => (
                <li key={label} className="flex gap-3">
                  <Icon className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
                    {href ? (
                      <a href={href} className="break-words text-sm font-medium text-navy-900 hover:text-gold-700">
                        {value}
                      </a>
                    ) : (
                      <p className="break-words text-sm font-medium text-navy-900">{value}</p>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </Card>

          {editable ? (
            <Card title="Pipeline">
              <form action={save} className="space-y-4">
                <div>
                  <label htmlFor="status" className="text-sm font-medium text-navy-900">
                    Stage
                  </label>
                  <select id="status" name="status" defaultValue={lead.status} className={`${inputClass} mt-1.5`}>
                    {STAGES.map((s) => (
                      <option key={s} value={s}>
                        {s.charAt(0) + s.slice(1).toLowerCase()}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="ownerId" className="text-sm font-medium text-navy-900">
                    Owner
                  </label>
                  <select id="ownerId" name="ownerId" defaultValue={lead.ownerId ?? ""} className={`${inputClass} mt-1.5`}>
                    <option value="">— Unassigned —</option>
                    {owners.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label htmlFor="score" className="text-sm font-medium text-navy-900">
                      Score
                    </label>
                    <input
                      id="score"
                      name="score"
                      type="number"
                      min={0}
                      max={100}
                      defaultValue={lead.score}
                      className={`${inputClass} mt-1.5`}
                    />
                  </div>
                  <div>
                    <label htmlFor="nextFollowUpAt" className="text-sm font-medium text-navy-900">
                      Follow up
                    </label>
                    <input
                      id="nextFollowUpAt"
                      name="nextFollowUpAt"
                      type="date"
                      defaultValue={lead.nextFollowUpAt ? lead.nextFollowUpAt.toISOString().slice(0, 10) : ""}
                      className={`${inputClass} mt-1.5`}
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="lostReason" className="text-sm font-medium text-navy-900">
                    Lost reason
                  </label>
                  <textarea
                    id="lostReason"
                    name="lostReason"
                    rows={2}
                    defaultValue={lead.lostReason ?? ""}
                    placeholder="Only needed if the stage is Lost"
                    className={`${inputClass} mt-1.5`}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
                >
                  Update lead
                </button>
              </form>
            </Card>
          ) : null}

          {editable ? (
            <Card title="Danger zone">
              <form action={remove}>
                <button
                  type="submit"
                  className="w-full rounded-xl border border-red-200 px-4 py-2.5 text-sm font-semibold text-red-600 transition-colors hover:bg-red-50"
                >
                  Delete this lead
                </button>
              </form>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
