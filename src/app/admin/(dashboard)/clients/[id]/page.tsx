import { notFound } from "next/navigation";
import Link from "next/link";
import {
  ArrowLeft,
  Briefcase,
  FileSignature,
  Globe,
  MapPin,
  Pencil,
} from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit, canView } from "@/lib/permissions";
import { addClientActivity } from "@/app/admin/actions/crm";
import { Badge, Card, PageHeader, inputClass } from "@/components/admin/ui";
import { ClientContacts } from "@/components/admin/ClientContacts";
import { asArray, formatDate } from "@/lib/utils";

const STATUS_TONE = { PROSPECT: "warn", ACTIVE: "success", ON_HOLD: "neutral", CHURNED: "muted" } as const;
const ACTIVITY_TYPES = ["NOTE", "CALL", "EMAIL", "MEETING", "WHATSAPP", "FOLLOW_UP"];

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModule("clients");
  const { id } = await params;

  const client = await prisma.client.findUnique({
    where: { id },
    include: {
      owner: { select: { name: true } },
      contacts: { orderBy: [{ isPrimary: "desc" }, { name: "asc" }] },
      activities: { orderBy: { createdAt: "desc" }, take: 30, include: { author: { select: { name: true } } } },
      quotations: { orderBy: { createdAt: "desc" }, take: 10 },
      projects: { orderBy: { createdAt: "desc" }, take: 10 },
      leads: { orderBy: { createdAt: "desc" }, take: 5 },
    },
  });
  if (!client) notFound();

  const editable = canEdit(session.role, "clients");
  const address = [client.addressLine, client.city, client.state, client.postalCode, client.country]
    .filter(Boolean)
    .join(", ");
  const tags = asArray<string>(client.tags);
  const logActivity = addClientActivity.bind(null, client.id);

  return (
    <>
      <Link href="/admin/clients" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All clients
      </Link>

      <PageHeader
        title={client.name}
        description={`${client.code}${client.industry ? ` · ${client.industry}` : ""}${client.owner ? ` · managed by ${client.owner.name}` : ""}`}
        actions={
          editable ? (
            <Link
              href={`/admin/clients/${client.id}/edit`}
              className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
            >
              <Pencil className="size-4" aria-hidden /> Edit
            </Link>
          ) : null
        }
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <Badge tone={STATUS_TONE[client.status]}>
          {client.status === "ON_HOLD" ? "on hold" : client.status.toLowerCase()}
        </Badge>
        {tags.map((t) => (
          <Badge key={t} tone="neutral">
            {t}
          </Badge>
        ))}
        <span className="ml-auto text-xs text-slate-500">Health {client.healthScore}/100</span>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <ClientContacts
            clientId={client.id}
            contacts={client.contacts.map((c) => ({
              id: c.id,
              name: c.name,
              designation: c.designation,
              email: c.email,
              phone: c.phone,
              whatsapp: c.whatsapp,
              isPrimary: c.isPrimary,
            }))}
            editable={editable}
          />

          <Card title="Timeline" description="Calls, emails, meetings and notes for this client.">
            {editable ? (
              <form action={logActivity} className="mb-5 space-y-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4">
                <div className="grid gap-3 sm:grid-cols-3">
                  <select name="type" defaultValue="NOTE" className={inputClass} aria-label="Activity type">
                    {ACTIVITY_TYPES.map((t) => (
                      <option key={t} value={t}>
                        {t.charAt(0) + t.slice(1).toLowerCase().replace("_", " ")}
                      </option>
                    ))}
                  </select>
                  <input name="subject" placeholder="Subject (optional)" className={`${inputClass} sm:col-span-2`} />
                </div>
                <textarea name="body" required rows={2} placeholder="What happened?" className={inputClass} />
                <div className="flex flex-wrap items-center gap-3">
                  <label className="text-xs text-slate-500" htmlFor="dueAt">
                    Follow up on
                  </label>
                  <input id="dueAt" name="dueAt" type="date" className="rounded-lg border border-navy-900/15 px-3 py-1.5 text-sm" />
                  <button
                    type="submit"
                    className="ml-auto rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white hover:bg-navy-800"
                  >
                    Log activity
                  </button>
                </div>
              </form>
            ) : null}

            {client.activities.length ? (
              <ol className="space-y-4">
                {client.activities.map((a) => (
                  <li key={a.id} className="border-l-2 border-gold-400/50 pl-4">
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="neutral">{a.type.toLowerCase().replace("_", " ")}</Badge>
                      {a.subject ? <span className="text-sm font-medium text-navy-900">{a.subject}</span> : null}
                      <span className="ml-auto text-xs text-slate-400">
                        {formatDate(a.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <p className="mt-1 whitespace-pre-wrap text-sm text-slate-600">{a.body}</p>
                    <p className="mt-1 text-xs text-slate-400">
                      {a.author?.name ?? "Team"}
                      {a.dueAt ? ` · follow up ${formatDate(a.dueAt)}` : ""}
                    </p>
                  </li>
                ))}
              </ol>
            ) : (
              <p className="text-sm text-slate-500">Nothing logged yet.</p>
            )}
          </Card>
        </div>

        <div className="space-y-6">
          <Card title="Details">
            <dl className="space-y-4 text-sm">
              {address ? (
                <div className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
                  <div>
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Address</dt>
                    <dd className="text-navy-900">{address}</dd>
                  </div>
                </div>
              ) : null}
              {client.website ? (
                <div className="flex gap-3">
                  <Globe className="mt-0.5 size-4 shrink-0 text-gold-600" aria-hidden />
                  <div className="min-w-0">
                    <dt className="text-xs uppercase tracking-wide text-slate-500">Website</dt>
                    <dd className="truncate text-navy-900">{client.website}</dd>
                  </div>
                </div>
              ) : null}
              {client.gstin ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">GSTIN</dt>
                  <dd className="text-navy-900">{client.gstin}</dd>
                </div>
              ) : null}
              {client.notes ? (
                <div>
                  <dt className="text-xs uppercase tracking-wide text-slate-500">Notes</dt>
                  <dd className="whitespace-pre-wrap text-slate-600">{client.notes}</dd>
                </div>
              ) : null}
            </dl>
          </Card>

          {canView(session.role, "quotations") ? (
            <Card title="Quotations">
              {client.quotations.length ? (
                <ul className="space-y-2">
                  {client.quotations.map((q) => (
                    <li key={q.id}>
                      <Link
                        href={`/admin/quotations/${q.id}`}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-navy-900">{q.title}</span>
                          <span className="block text-xs text-slate-500">{q.number}</span>
                        </span>
                        <Badge tone={q.status === "ACCEPTED" ? "success" : "neutral"}>{q.status.toLowerCase()}</Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No quotations yet.</p>
              )}
              {canEdit(session.role, "quotations") ? (
                <Link
                  href={`/admin/quotations/new?clientId=${client.id}`}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-gold-700 hover:text-gold-900"
                >
                  <FileSignature className="size-4" aria-hidden /> New quotation
                </Link>
              ) : null}
            </Card>
          ) : null}

          {canView(session.role, "projects") ? (
            <Card title="Projects">
              {client.projects.length ? (
                <ul className="space-y-2">
                  {client.projects.map((p) => (
                    <li key={p.id}>
                      <Link
                        href={`/admin/client-projects/${p.id}`}
                        className="flex items-center justify-between rounded-lg px-3 py-2 text-sm hover:bg-slate-50"
                      >
                        <span className="min-w-0">
                          <span className="block truncate font-medium text-navy-900">{p.name}</span>
                          <span className="block text-xs text-slate-500">{p.code}</span>
                        </span>
                        <Badge tone={p.health === "ON_TRACK" ? "success" : p.health === "AT_RISK" ? "warn" : "muted"}>
                          {p.stage.toLowerCase()}
                        </Badge>
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">No projects yet.</p>
              )}
              {canEdit(session.role, "projects") ? (
                <Link
                  href={`/admin/client-projects/new?clientId=${client.id}`}
                  className="mt-3 inline-flex items-center gap-2 text-sm font-semibold text-gold-700 hover:text-gold-900"
                >
                  <Briefcase className="size-4" aria-hidden /> New project
                </Link>
              ) : null}
            </Card>
          ) : null}

          {client.leads.length ? (
            <Card title="Originating leads">
              <ul className="space-y-2">
                {client.leads.map((l) => (
                  <li key={l.id}>
                    <Link href={`/admin/leads/${l.id}`} className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-50">
                      <span className="block font-medium text-navy-900">{l.name}</span>
                      <span className="block text-xs text-slate-500">
                        {l.serviceInterest || "General"} · {formatDate(l.createdAt)}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
