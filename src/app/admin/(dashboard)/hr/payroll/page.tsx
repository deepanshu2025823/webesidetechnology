import Link from "next/link";
import { Printer } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { generatePayslips, saveIncentive, saveSalaryStructure, setPayslipStatus } from "@/app/admin/actions/hr";
import { Badge, Card, EmptyState, PageHeader, inputClass } from "@/components/admin/ui";
import { formatDate, formatMoney } from "@/lib/utils";

const TONE = { DRAFT: "muted", APPROVED: "neutral", PAID: "success" } as const;
const INCENTIVE_TYPES = ["REFERRAL", "PROJECT_BONUS", "PERFORMANCE", "OTHER"];
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export default async function PayrollPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>;
}) {
  const session = await requireModule("payroll");
  const { month: monthRaw } = await searchParams;

  const now = new Date();
  const month = monthRaw
    ? new Date(Number(monthRaw.split("-")[0]), Number(monthRaw.split("-")[1]) - 1, 1)
    : new Date(now.getFullYear(), now.getMonth(), 1);
  const next = new Date(month);
  next.setMonth(next.getMonth() + 1);

  const [payslips, employees, structures] = await Promise.all([
    prisma.payslip.findMany({
      where: { month: { gte: month, lt: next } },
      include: { employee: { select: { name: true, department: true } } },
      orderBy: { employee: { name: "asc" } },
    }),
    prisma.employee.findMany({ where: { isActive: true }, select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.salaryStructure.findMany({
      orderBy: { effectiveFrom: "desc" },
      take: 20,
      include: { employee: { select: { name: true } } },
    }),
  ]);

  const editable = canEdit(session.role, "payroll");
  const totalNet = payslips.reduce((sum, p) => sum + p.netPay, 0);
  const paid = payslips.filter((p) => p.status === "PAID").length;

  return (
    <>
      <PageHeader
        title="Payroll"
        description={`${formatDate(month, { month: "long", year: "numeric" })} · ${formatMoney(totalNet)} across ${payslips.length} payslip(s), ${paid} paid.`}
      />

      <form action="/admin/hr/payroll" className="mb-6 flex items-center gap-3">
        <label htmlFor="month" className="text-sm text-slate-600">
          Month
        </label>
        <input
          id="month"
          name="month"
          type="month"
          defaultValue={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`}
          className="rounded-xl border border-navy-900/15 px-3.5 py-2 text-sm"
        />
        <button type="submit" className="rounded-xl bg-navy-900 px-4 py-2 text-sm font-semibold text-white">
          Show
        </button>
      </form>

      {editable ? (
        <div className="mb-6 grid gap-6 lg:grid-cols-3">
          <Card title="Prepare payslips" description="Builds drafts from salary structures and recorded attendance.">
            <form
              action={async (formData: FormData) => {
                "use server";
                await generatePayslips({}, formData);
              }}
              className="space-y-3"
            >
              <input
                name="month"
                type="month"
                required
                defaultValue={`${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, "0")}`}
                className={inputClass}
                aria-label="Payroll month"
              />
              <button type="submit" className="w-full rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
                Generate drafts
              </button>
            </form>
          </Card>

          <Card title="Salary structure" description="A new row supersedes the previous one from its effective date.">
            <form action={saveSalaryStructure} className="space-y-3">
              <select name="employeeId" required defaultValue="" className={inputClass} aria-label="Employee">
                <option value="">Select employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              <div className="grid grid-cols-2 gap-3">
                <input name="basic" type="number" min={0} placeholder="Basic ₹" className={inputClass} />
                <input name="hra" type="number" min={0} placeholder="HRA ₹" className={inputClass} />
                <input name="allowances" type="number" min={0} placeholder="Allowances ₹" className={inputClass} />
                <input name="deductions" type="number" min={0} placeholder="Deductions ₹" className={inputClass} />
              </div>
              <input name="effectiveFrom" type="date" required className={inputClass} aria-label="Effective from" />
              <button type="submit" className="w-full rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
                Save structure
              </button>
            </form>
          </Card>

          <Card title="Incentive or bonus" description="Referral incentives and project bonuses are recorded separately.">
            <form action={saveIncentive} className="space-y-3">
              <select name="employeeId" required defaultValue="" className={inputClass} aria-label="Employee">
                <option value="">Select employee</option>
                {employees.map((e) => (
                  <option key={e.id} value={e.id}>
                    {e.name}
                  </option>
                ))}
              </select>
              <select name="type" defaultValue="PROJECT_BONUS" className={inputClass} aria-label="Incentive type">
                {INCENTIVE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {pretty(t)}
                  </option>
                ))}
              </select>
              <input name="amount" type="number" min={1} required placeholder="Amount ₹" className={inputClass} />
              <input name="reason" required placeholder="Reason" className={inputClass} />
              <input name="month" type="date" className={inputClass} aria-label="Applies to month" />
              <button type="submit" className="w-full rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
                Record incentive
              </button>
            </form>
          </Card>
        </div>
      ) : null}

      {payslips.length === 0 ? (
        <EmptyState
          title="No payslips for this month"
          description={editable ? "Generate drafts once salary structures and attendance are in place." : "Nothing prepared yet."}
        />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
          <div className="scroll-slim overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-5 py-3 font-medium">Employee</th>
                  <th className="px-5 py-3 text-center font-medium">Present</th>
                  <th className="px-5 py-3 text-center font-medium">Leave</th>
                  <th className="px-5 py-3 text-right font-medium">Fixed</th>
                  <th className="px-5 py-3 text-right font-medium">Incentives</th>
                  <th className="px-5 py-3 text-right font-medium">Deductions</th>
                  <th className="px-5 py-3 text-right font-medium">Net pay</th>
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Slip</th>
                  {editable ? <th className="px-5 py-3 text-right font-medium">Action</th> : null}
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-900/5">
                {payslips.map((slip) => (
                  <tr key={slip.id} className="hover:bg-slate-50/70">
                    <td className="px-5 py-3.5">
                      <span className="font-medium text-navy-900">{slip.employee.name}</span>
                      <span className="block text-xs text-slate-500">{slip.employee.department}</span>
                    </td>
                    <td className="px-5 py-3.5 text-center text-slate-600">{slip.presentDays}</td>
                    <td className="px-5 py-3.5 text-center text-slate-600">{slip.leaveDays}</td>
                    <td className="px-5 py-3.5 text-right text-slate-600">{formatMoney(slip.fixedPay)}</td>
                    <td className="px-5 py-3.5 text-right text-slate-600">{formatMoney(slip.incentives)}</td>
                    <td className="px-5 py-3.5 text-right text-slate-600">{formatMoney(slip.deductions)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold text-navy-900">{formatMoney(slip.netPay)}</td>
                    <td className="px-5 py-3.5">
                      <Badge tone={TONE[slip.status]}>{pretty(slip.status)}</Badge>
                    </td>
                    <td className="px-5 py-3.5">
                      <Link
                        href={`/admin/print/payslip/${slip.id}`}
                        target="_blank"
                        className="inline-flex items-center gap-1.5 rounded-lg border border-navy-900/15 px-2.5 py-1.5 text-xs font-medium text-navy-800 hover:border-gold-500 hover:bg-gold-50"
                      >
                        <Printer className="size-3.5" aria-hidden /> Print
                      </Link>
                    </td>
                    {editable ? (
                      <td className="px-5 py-3.5">
                        <form action={setPayslipStatus.bind(null, slip.id)} className="flex items-center justify-end gap-1.5">
                          <select
                            name="status"
                            defaultValue={slip.status}
                            aria-label={`Status for ${slip.employee.name}`}
                            className="rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs"
                          >
                            {["DRAFT", "APPROVED", "PAID"].map((s) => (
                              <option key={s} value={s}>
                                {pretty(s)}
                              </option>
                            ))}
                          </select>
                          <input
                            name="reference"
                            placeholder="UTR"
                            defaultValue={slip.reference}
                            className="w-24 rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs"
                            aria-label="Payment reference"
                          />
                          <button type="submit" className="rounded-lg bg-navy-900 px-3 py-1.5 text-xs font-semibold text-white">
                            Save
                          </button>
                        </form>
                      </td>
                    ) : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {structures.length ? (
        <Card title="Recent salary structures" className="mt-6">
          <ul className="divide-y divide-navy-900/5">
            {structures.map((s) => (
              <li key={s.id} className="flex items-center gap-3 py-2.5 text-sm">
                <span className="min-w-0 flex-1">
                  <span className="block font-medium text-navy-900">{s.employee.name}</span>
                  <span className="block text-xs text-slate-500">
                    Basic {formatMoney(s.basic)} · HRA {formatMoney(s.hra)} · Allowances {formatMoney(s.allowances)}
                  </span>
                </span>
                <span className="text-right">
                  <span className="block font-medium text-navy-900">{formatMoney(s.ctc)}</span>
                  <span className="block text-xs text-slate-400">from {formatDate(s.effectiveFrom)}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>
      ) : null}
    </>
  );
}
