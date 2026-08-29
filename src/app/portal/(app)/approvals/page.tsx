import { prisma } from "@/lib/prisma";
import { requirePortalSession } from "@/lib/portal-auth";
import { decideApproval } from "@/app/admin/actions/portal";
import { formatDate } from "@/lib/utils";

const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

export default async function PortalApprovalsPage() {
  const session = await requirePortalSession();

  const approvals = await prisma.approval.findMany({
    where: { clientId: session.clientId },
    orderBy: [{ status: "asc" }, { createdAt: "desc" }],
    include: {
      project: { select: { name: true } },
      comments: { orderBy: { createdAt: "asc" } },
    },
  });

  const pending = approvals.filter((a) => a.status === "PENDING");

  return (
    <>
      <h1 className="text-2xl font-semibold text-navy-900">Approvals</h1>
      <p className="mt-1 text-sm text-slate-500">
        {pending.length ? `${pending.length} item(s) waiting on you.` : "Nothing waiting on you right now."}
      </p>

      {approvals.length ? (
        <ul className="mt-6 space-y-4">
          {approvals.map((approval) => (
            <li key={approval.id} className="rounded-2xl border border-navy-900/10 bg-white p-6 shadow-sm">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <h2 className="font-medium text-navy-900">{approval.title}</h2>
                  <p className="text-xs text-slate-500">
                    {approval.entity}
                    {approval.project ? ` · ${approval.project.name}` : ""}
                    {approval.dueAt ? ` · needed by ${formatDate(approval.dueAt)}` : ""}
                  </p>
                </div>
                <span
                  className={
                    approval.status === "APPROVED"
                      ? "rounded-full bg-emerald-50 px-3 py-1 text-xs font-medium text-emerald-700"
                      : approval.status === "REJECTED"
                        ? "rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
                        : "rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                  }
                >
                  {pretty(approval.status)}
                </span>
              </div>

              {approval.description ? (
                <p className="mt-3 whitespace-pre-wrap text-sm text-slate-600">{approval.description}</p>
              ) : null}

              {approval.comments.length ? (
                <ul className="mt-4 space-y-2 border-t border-navy-900/5 pt-3">
                  {approval.comments.map((c) => (
                    <li key={c.id} className="rounded-lg bg-slate-50 p-3 text-sm text-slate-700">
                      {c.body}
                      <span className="mt-1 block text-xs text-slate-400">{formatDate(c.createdAt)}</span>
                    </li>
                  ))}
                </ul>
              ) : null}

              {approval.status === "PENDING" ? (
                <form action={decideApproval.bind(null, approval.id)} className="mt-4 space-y-3 border-t border-navy-900/5 pt-4">
                  <textarea
                    name="comment"
                    rows={2}
                    placeholder="Any comments or changes you'd like?"
                    className="w-full rounded-xl border border-navy-900/15 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none"
                  />
                  <div className="flex gap-3">
                    <button
                      type="submit"
                      name="status"
                      value="APPROVED"
                      className="rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
                    >
                      Approve
                    </button>
                    <button
                      type="submit"
                      name="status"
                      value="REJECTED"
                      className="rounded-xl border border-navy-900/15 px-5 py-2.5 text-sm font-semibold text-navy-800 hover:bg-slate-50"
                    >
                      Request changes
                    </button>
                  </div>
                </form>
              ) : null}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-6 rounded-2xl border border-dashed border-navy-900/20 bg-white px-6 py-10 text-center text-sm text-slate-500">
          Nothing to approve yet.
        </p>
      )}
    </>
  );
}
