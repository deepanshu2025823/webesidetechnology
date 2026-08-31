import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { decideLeave, requestLeave } from "@/app/admin/actions/hr";
import { Badge, Card, EmptyState, PageHeader, inputClass } from "@/components/admin/ui";
import { DataTools } from "@/components/admin/DataTools";
import { formatDate } from "@/lib/utils";

const TYPES = ["CASUAL", "SICK", "EARNED", "UNPAID"];
const TONE = { REQUESTED: "warn", APPROVED: "success", REJECTED: "muted" } as const;
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

export default async function LeavePage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; status?: string; from?: string; to?: string }>;
}) {
  const session = await requireModule("team");
  const { q, status, from, to } = await searchParams;
  const term = q?.trim();
  const end = to ? new Date(to) : undefined;
  if (end) end.setHours(23, 59, 59, 999);

  const [requests, employees] = await Promise.all([
    prisma.leaveRequest.findMany({
      where: {
        ...(status && status !== "ALL" ? { status: status as never } : {}),
        ...(term ? { OR: [{ reason: { contains: term } }, { employee: { name: { contains: term } } }] } : {}),
        ...(from || end ? { fromDate: { ...(from ? { gte: new Date(from) } : {}), ...(end ? { lte: end } : {}) } } : {}),
      },
      orderBy: [{ status: "asc" }, { fromDate: "desc" }],
      include: { employee: { select: { name: true, department: true } }, decidedBy: { select: { name: true } } },
    }),
    prisma.employee.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const editable = canEdit(session.role, "team");
  const pending = requests.filter((r) => r.status === "REQUESTED").length;

  return (
    <>
      <PageHeader title="Leave" description={pending ? `${pending} request(s) awaiting a decision.` : "All caught up."} />

      <Card title="New leave request" className="mb-6">
        <form
          action={async (formData: FormData) => {
            "use server";
            await requestLeave({}, formData);
          }}
          className="grid gap-3 sm:grid-cols-12"
        >
          <select name="employeeId" required defaultValue="" className={`${inputClass} sm:col-span-3`} aria-label="Employee">
            <option value="">Select employee</option>
            {employees.map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
          <select name="type" defaultValue="CASUAL" className={`${inputClass} sm:col-span-2`} aria-label="Leave type">
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {pretty(t)}
              </option>
            ))}
          </select>
          <input name="fromDate" type="date" required className={`${inputClass} sm:col-span-2`} aria-label="From" />
          <input name="toDate" type="date" required className={`${inputClass} sm:col-span-2`} aria-label="To" />
          <input name="reason" required placeholder="Reason" className={`${inputClass} sm:col-span-3`} />
          <button
            type="submit"
            className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-12"
          >
            Submit request
          </button>
        </form>
      </Card>

      <DataTools dataset="leave-requests" />

      {requests.length === 0 ? (
        <EmptyState
          title={term ? `Nothing matches “${term}”` : "No leave requests"}
          description={term ? "Try a shorter search, or clear the filters." : "Requests appear here for approval."}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">Employee</th>
                <th className="px-5 py-3 font-medium">Type</th>
                <th className="px-5 py-3 font-medium">Dates</th>
                <th className="px-5 py-3 font-medium">Reason</th>
                <th className="px-5 py-3 font-medium">Status</th>
                {editable ? <th className="px-5 py-3 text-right font-medium">Decision</th> : null}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-900/5">
              {requests.map((r) => (
                <tr key={r.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5">
                    <span className="font-medium text-navy-900">{r.employee.name}</span>
                    <span className="block text-xs text-slate-500">{r.employee.department}</span>
                  </td>
                  <td className="px-5 py-3.5 text-slate-600">{pretty(r.type)}</td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    {formatDate(r.fromDate)} – {formatDate(r.toDate)}
                    <span className="block text-slate-400">{r.days} day(s)</span>
                  </td>
                  <td className="max-w-64 px-5 py-3.5 text-xs text-slate-600">{r.reason}</td>
                  <td className="px-5 py-3.5">
                    <Badge tone={TONE[r.status]}>{pretty(r.status)}</Badge>
                    {r.decidedBy ? <span className="block text-xs text-slate-400">{r.decidedBy.name}</span> : null}
                  </td>
                  {editable ? (
                    <td className="px-5 py-3.5 text-right">
                      {r.status === "REQUESTED" ? (
                        <div className="inline-flex gap-2">
                          {["APPROVED", "REJECTED"].map((decision) => (
                            <form key={decision} action={decideLeave.bind(null, r.id)}>
                              <input type="hidden" name="status" value={decision} />
                              <button
                                type="submit"
                                className={
                                  decision === "APPROVED"
                                    ? "rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white hover:bg-navy-800"
                                    : "rounded-lg border border-navy-900/15 px-3 py-1.5 text-xs font-semibold text-navy-700 hover:bg-slate-50"
                                }
                              >
                                {decision === "APPROVED" ? "Approve" : "Reject"}
                              </button>
                            </form>
                          ))}
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Decided</span>
                      )}
                    </td>
                  ) : null}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}
