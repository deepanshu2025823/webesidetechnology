import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { markAttendance } from "@/app/admin/actions/hr";
import { Badge, Card, EmptyState, PageHeader } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

const STATUSES = ["PRESENT", "ABSENT", "HALF_DAY", "LEAVE", "HOLIDAY", "WEEK_OFF"];
const TONE = {
  PRESENT: "success",
  ABSENT: "warn",
  HALF_DAY: "neutral",
  LEAVE: "neutral",
  HOLIDAY: "muted",
  WEEK_OFF: "muted",
} as const;
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export default async function AttendancePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const session = await requireModule("team");
  const { date } = await searchParams;

  const day = date ? new Date(date) : new Date();
  const dayStart = new Date(day.getFullYear(), day.getMonth(), day.getDate());
  const dayEnd = new Date(dayStart);
  dayEnd.setDate(dayEnd.getDate() + 1);

  const [employees, records] = await Promise.all([
    prisma.employee.findMany({ where: { isActive: true }, orderBy: { name: "asc" } }),
    prisma.attendance.findMany({
      where: { date: { gte: dayStart, lt: dayEnd } },
      include: { employee: { select: { id: true, name: true, department: true } }, approvedBy: { select: { name: true } } },
    }),
  ]);

  const byEmployee = new Map(records.map((r) => [r.employeeId, r]));
  const editable = canEdit(session.role, "team");
  const present = records.filter((r) => r.status === "PRESENT").length;

  return (
    <>
      <PageHeader
        title="Attendance"
        description={`${present} of ${employees.length} marked present on ${formatDate(dayStart, { day: "numeric", month: "long", year: "numeric" })}.`}
      />

      <form action="/admin/hr/attendance" className="mb-6 flex items-center gap-3">
        <label htmlFor="date" className="text-sm text-slate-600">
          Show
        </label>
        <input
          id="date"
          name="date"
          type="date"
          defaultValue={dayStart.toISOString().slice(0, 10)}
          className="rounded-xl border border-navy-900/15 px-3.5 py-2 text-sm"
        />
        <button type="submit" className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white">
          Go
        </button>
      </form>

      {employees.length === 0 ? (
        <EmptyState
          title="No employees yet"
          description="Add people under Employees before recording attendance."
          action={
            <Link href="/admin/hr/employees" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white">
              Add employees
            </Link>
          }
        />
      ) : (
        <Card>
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-900/10 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="py-2 font-medium">Employee</th>
                  <th className="py-2 font-medium">Status</th>
                  <th className="py-2 font-medium">In</th>
                  <th className="py-2 font-medium">Out</th>
                  <th className="py-2 font-medium">Recorded by</th>
                  {editable ? <th className="py-2 text-right font-medium">Mark</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {employees.map((employee) => {
                  const record = byEmployee.get(employee.id);
                  return (
                    <tr key={employee.id}>
                      <td className="py-3">
                        <span className="font-medium text-navy-900">{employee.name}</span>
                        <span className="block text-xs text-slate-500">{employee.department || employee.designation}</span>
                      </td>
                      <td className="py-3">
                        {record ? (
                          <Badge tone={TONE[record.status]}>{pretty(record.status)}</Badge>
                        ) : (
                          <span className="text-xs text-slate-400">Not marked</span>
                        )}
                      </td>
                      <td className="py-3 text-xs text-slate-500">
                        {record?.checkIn ? record.checkIn.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="py-3 text-xs text-slate-500">
                        {record?.checkOut ? record.checkOut.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }) : "—"}
                      </td>
                      <td className="py-3 text-xs text-slate-500">
                        {record ? `${pretty(record.source)}${record.approvedBy ? ` · ${record.approvedBy.name}` : ""}` : "—"}
                      </td>

                      {editable ? (
                        <td className="py-3">
                          <form action={markAttendance} className="flex items-center justify-end gap-1.5">
                            <input type="hidden" name="employeeId" value={employee.id} />
                            <input type="hidden" name="date" value={dayStart.toISOString().slice(0, 10)} />
                            <input type="hidden" name="source" value="MANAGER" />
                            <select
                              name="status"
                              defaultValue={record?.status ?? "PRESENT"}
                              aria-label={`Status for ${employee.name}`}
                              className="rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs"
                            >
                              {STATUSES.map((s) => (
                                <option key={s} value={s}>
                                  {pretty(s)}
                                </option>
                              ))}
                            </select>
                            <input
                              name="checkIn"
                              type="time"
                              defaultValue={
                                record?.checkIn
                                  ? `${String(record.checkIn.getHours()).padStart(2, "0")}:${String(record.checkIn.getMinutes()).padStart(2, "0")}`
                                  : ""
                              }
                              className="w-24 rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs"
                              aria-label="Check in"
                            />
                            <input
                              name="checkOut"
                              type="time"
                              defaultValue={
                                record?.checkOut
                                  ? `${String(record.checkOut.getHours()).padStart(2, "0")}:${String(record.checkOut.getMinutes()).padStart(2, "0")}`
                                  : ""
                              }
                              className="w-24 rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs"
                              aria-label="Check out"
                            />
                            <button type="submit" className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white">
                              Save
                            </button>
                          </form>
                        </td>
                      ) : null}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <p className="mt-4 text-xs text-slate-500">
            Attendance is recorded explicitly by the employee or a manager. It is never inferred from laptop activity
            alone, and any entry can be corrected here.
          </p>
        </Card>
      )}
    </>
  );
}
