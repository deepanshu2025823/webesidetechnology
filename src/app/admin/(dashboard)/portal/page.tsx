import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { assignTicket, requestApproval, savePortalUser } from "@/app/admin/actions/portal";
import { PortalUserRow } from "@/components/admin/PortalUserRow";
import { Badge, Card, PageHeader, inputClass } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export default async function AdminPortalPage() {
  const session = await requireModule("portal");

  const [users, approvals, tickets, clients, projects, staff] = await Promise.all([
    prisma.clientPortalUser.findMany({
      orderBy: { createdAt: "desc" },
      include: { client: { select: { name: true } } },
    }),
    prisma.approval.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 30,
      include: { client: { select: { name: true } }, project: { select: { name: true } } },
    }),
    prisma.ticket.findMany({
      orderBy: [{ status: "asc" }, { createdAt: "desc" }],
      take: 30,
      include: { client: { select: { name: true } }, assignee: { select: { name: true } } },
    }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.clientProject.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }),
  ]);

  const editable = canEdit(session.role, "portal");
  const pendingApprovals = approvals.filter((a) => a.status === "PENDING").length;
  const openTickets = tickets.filter((t) => t.status === "OPEN" || t.status === "IN_PROGRESS").length;

  return (
    <>
      <PageHeader
        title="Client portal"
        description={`${users.length} login(s) · ${pendingApprovals} approval(s) pending · ${openTickets} open request(s). Clients sign in at /portal.`}
        actions={
          <Link
            href="/portal/login"
            target="_blank"
            className="rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
          >
            Open portal
          </Link>
        }
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card title="Portal logins" description="One login per client contact. They only ever see their own account.">
          {editable ? (
            <form
              action={async (formData: FormData) => {
                "use server";
                await savePortalUser({}, formData);
              }}
              className="mb-5 grid gap-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4 sm:grid-cols-2"
            >
              <select name="clientId" required defaultValue="" className={inputClass} aria-label="Client">
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <input name="name" required placeholder="Contact name" className={inputClass} />
              <input name="email" type="email" required placeholder="Email" className={inputClass} />
              <input name="password" type="password" minLength={8} required placeholder="Password" className={inputClass} />
              <input type="hidden" name="isActive" value="on" />
              <button
                type="submit"
                className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-2"
              >
                Create login
              </button>
            </form>
          ) : null}

          {users.length ? (
            <ul className="divide-y divide-navy-900/5">
              {users.map((user) => (
                <PortalUserRow
                  key={user.id}
                  user={{
                    id: user.id,
                    name: user.name,
                    email: user.email,
                    clientName: user.client.name,
                    isActive: user.isActive,
                    lastLoginAt: user.lastLoginAt ? user.lastLoginAt.toISOString() : null,
                  }}
                  editable={editable}
                />
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No portal logins yet.</p>
          )}
        </Card>

        <Card title="Approvals" description="Sign-off checkpoints raised to clients.">
          {editable ? (
            <form
              action={async (formData: FormData) => {
                "use server";
                await requestApproval({}, formData);
              }}
              className="mb-5 grid gap-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4 sm:grid-cols-2"
            >
              <select name="clientId" required defaultValue="" className={inputClass} aria-label="Client">
                <option value="">Select client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <select name="projectId" defaultValue="" className={inputClass} aria-label="Project">
                <option value="">No project</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              <input name="title" required placeholder="What needs approving?" className={`${inputClass} sm:col-span-2`} />
              <input name="entity" placeholder="Type (Design, Content, UAT…)" className={inputClass} />
              <input name="dueAt" type="date" className={inputClass} aria-label="Needed by" />
              <textarea name="description" rows={2} placeholder="Context for the client" className={`${inputClass} sm:col-span-2`} />
              <button
                type="submit"
                className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-2"
              >
                Request approval
              </button>
            </form>
          ) : null}

          {approvals.length ? (
            <ul className="divide-y divide-navy-900/5">
              {approvals.map((approval) => (
                <li key={approval.id} className="flex items-center gap-3 py-2.5 text-sm">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-navy-900">{approval.title}</span>
                    <span className="block text-xs text-slate-500">
                      {approval.client.name}
                      {approval.project ? ` · ${approval.project.name}` : ""}
                      {approval.dueAt ? ` · by ${formatDate(approval.dueAt)}` : ""}
                    </span>
                  </span>
                  <Badge
                    tone={
                      approval.status === "APPROVED" ? "success" : approval.status === "REJECTED" ? "muted" : "warn"
                    }
                  >
                    {pretty(approval.status)}
                  </Badge>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-500">No approvals raised yet.</p>
          )}
        </Card>
      </div>

      <Card title="Client requests" className="mt-6">
        {tickets.length ? (
          <ul className="divide-y divide-navy-900/5">
            {tickets.map((ticket) => (
              <li key={ticket.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-navy-900">{ticket.subject}</span>
                  <span className="block text-xs text-slate-500">
                    {ticket.client.name} · {pretty(ticket.priority)} · {formatDate(ticket.createdAt)}
                  </span>
                </span>

                {editable ? (
                  <form action={assignTicket.bind(null, ticket.id)} className="flex items-center gap-1.5">
                    <select
                      name="assigneeId"
                      defaultValue={ticket.assigneeId ?? ""}
                      aria-label="Assignee"
                      className="rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs"
                    >
                      <option value="">Unassigned</option>
                      {staff.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                    <select
                      name="status"
                      defaultValue={ticket.status}
                      aria-label="Status"
                      className="rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs"
                    >
                      {["OPEN", "IN_PROGRESS", "RESOLVED", "CLOSED"].map((s) => (
                        <option key={s} value={s}>
                          {pretty(s)}
                        </option>
                      ))}
                    </select>
                    <button type="submit" className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white">
                      Save
                    </button>
                  </form>
                ) : (
                  <Badge tone={ticket.status === "RESOLVED" ? "success" : "warn"}>{pretty(ticket.status)}</Badge>
                )}
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">No requests from clients yet.</p>
        )}
      </Card>
    </>
  );
}
