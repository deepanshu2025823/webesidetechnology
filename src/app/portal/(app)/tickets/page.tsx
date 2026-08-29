import { prisma } from "@/lib/prisma";
import { requirePortalSession } from "@/lib/portal-auth";
import { raiseTicket } from "@/app/admin/actions/portal";
import { formatDate } from "@/lib/utils";

const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export default async function PortalTicketsPage() {
  const session = await requirePortalSession();

  const tickets = await prisma.ticket.findMany({
    where: { clientId: session.clientId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: { assignee: { select: { name: true } } },
  });

  return (
    <>
      <h1 className="text-2xl font-semibold text-navy-900">Requests</h1>
      <p className="mt-1 text-sm text-slate-500">Raise a request and we will pick it up — no need to email.</p>

      <form
        action={raiseTicket}
        className="mt-6 space-y-3 rounded-2xl border border-navy-900/10 bg-white p-6 shadow-sm"
      >
        <input
          name="subject"
          required
          placeholder="What do you need?"
          className="w-full rounded-xl border border-navy-900/15 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none"
        />
        <textarea
          name="body"
          required
          rows={3}
          placeholder="A little more detail helps us move faster."
          className="w-full rounded-xl border border-navy-900/15 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none"
        />
        <div className="flex items-center gap-3">
          <select
            name="priority"
            defaultValue="MEDIUM"
            aria-label="Priority"
            className="rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm"
          >
            {["LOW", "MEDIUM", "HIGH", "CRITICAL"].map((p) => (
              <option key={p} value={p}>
                {pretty(p)}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="ml-auto rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            Send request
          </button>
        </div>
      </form>

      {tickets.length ? (
        <ul className="mt-6 space-y-3">
          {tickets.map((ticket) => (
            <li key={ticket.id} className="rounded-2xl border border-navy-900/10 bg-white p-5 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-medium text-navy-900">{ticket.subject}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(ticket.createdAt)} · {pretty(ticket.priority)} priority
                    {ticket.assignee ? ` · with ${ticket.assignee.name}` : ""}
                  </p>
                </div>
                <span
                  className={
                    ticket.status === "RESOLVED" || ticket.status === "CLOSED"
                      ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                      : "rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                  }
                >
                  {pretty(ticket.status)}
                </span>
              </div>
              <p className="mt-2 whitespace-pre-wrap text-sm text-slate-600">{ticket.body}</p>
            </li>
          ))}
        </ul>
      ) : null}
    </>
  );
}
