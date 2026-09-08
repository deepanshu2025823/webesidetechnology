import { notFound } from "next/navigation";
import Image from "next/image";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { agencyForPrint } from "@/components/admin/print-details";
import { getSettings } from "@/lib/queries";
import { formatDate, formatMoney } from "@/lib/utils";

/** Rupees in words, as an Indian payslip is expected to carry. */
function inWords(amount: number): string {
  if (amount <= 0) return "Zero only";

  const ones = [
    "", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine", "Ten",
    "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen",
  ];
  const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];

  const twoDigits = (n: number): string =>
    n < 20 ? ones[n] : `${tens[Math.floor(n / 10)]}${n % 10 ? ` ${ones[n % 10]}` : ""}`;

  const parts: string[] = [];
  // Indian numbering: crore, lakh, thousand, hundred, then the remainder.
  const units: [number, string][] = [
    [10_000_000, "Crore"],
    [100_000, "Lakh"],
    [1_000, "Thousand"],
    [100, "Hundred"],
  ];

  let remaining = Math.round(amount);
  for (const [value, label] of units) {
    const count = Math.floor(remaining / value);
    if (count) {
      parts.push(`${twoDigits(count)} ${label}`);
      remaining -= count * value;
    }
  }
  if (remaining) parts.push(twoDigits(remaining));

  return `${parts.join(" ")} only`;
}

/**
 * A month's payslip for one employee, on the company letterhead.
 *
 * The figures are the ones the payroll run stored, not recalculated here — a
 * payslip has to keep saying what was actually paid even if the salary
 * structure changes afterwards.
 */
export default async function PrintPayslipPage({ params }: { params: Promise<{ id: string }> }) {
  await requireModule("payroll");
  const { id } = await params;

  const [payslip, settings] = await Promise.all([
    prisma.payslip.findUnique({
      where: { id },
      include: { employee: true },
    }),
    getSettings(),
  ]);
  if (!payslip) notFound();

  const agency = agencyForPrint(settings);
  const { employee } = payslip;

  // The structure in force for that month explains how the fixed pay was made
  // up; without one the payslip still prints, as a single "fixed pay" line.
  const structure = await prisma.salaryStructure.findFirst({
    where: { employeeId: employee.id, effectiveFrom: { lte: payslip.month } },
    orderBy: { effectiveFrom: "desc" },
  });

  const gross = payslip.fixedPay + payslip.incentives + payslip.adjustments;
  const deductions = payslip.deductions + payslip.advances;

  const earnings: [string, number][] = structure
    ? ([
        ["Basic", structure.basic],
        ["House rent allowance", structure.hra],
        ["Other allowances", structure.allowances],
      ].filter(([, value]) => Number(value) > 0) as [string, number][])
    : [["Fixed pay", payslip.fixedPay]];

  // Attendance can prorate the month, so any gap between the structure and what
  // was actually paid is shown rather than quietly swallowed.
  const structured = earnings.reduce((sum, [, value]) => sum + value, 0);
  if (structure && structured !== payslip.fixedPay) {
    earnings.push(["Attendance adjustment", payslip.fixedPay - structured]);
  }
  if (payslip.incentives) earnings.push(["Incentives & bonus", payslip.incentives]);
  if (payslip.adjustments) earnings.push(["Adjustments", payslip.adjustments]);

  const takeHome: [string, number][] = [];
  if (payslip.deductions) takeHome.push(["Deductions", payslip.deductions]);
  if (payslip.advances) takeHome.push(["Advance recovered", payslip.advances]);

  return (
    <div className="mx-auto max-w-[820px] bg-white p-10 text-navy-900 print:mx-0 print:max-w-none print:px-[14mm] print:py-[12mm]">
      <style>{`
        @page { size: A4; margin: 0; }
        @media print {
          html, body { background: #fff; }
          tr { break-inside: avoid; }
          .print-block { break-inside: avoid; }
        }
      `}</style>

      <header className="flex items-start justify-between gap-8 border-b-2 border-gold-600 pb-6">
        <div>
          <Image src={agency.logo} alt={agency.name} width={1024} height={390} className="h-20 w-auto" />
          <p className="mt-3 font-display text-lg">{agency.name}</p>
          {agency.address ? <p className="text-xs text-slate-600">{agency.address}</p> : null}
          <p className="text-xs text-slate-600">{[agency.email, agency.phone].filter(Boolean).join(" · ")}</p>
        </div>

        <div className="text-right">
          <p className="font-display text-2xl uppercase tracking-wide text-gold-700">Payslip</p>
          <p className="mt-1 text-sm font-medium">
            {payslip.month.toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
          </p>
          <p className="mt-2 inline-block rounded border border-navy-900/20 px-2 py-0.5 text-[10px] uppercase tracking-wide">
            {payslip.status.toLowerCase()}
          </p>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-x-8 gap-y-2 rounded-xl bg-slate-50 p-5 text-sm">
        <Detail label="Employee" value={employee.name} />
        <Detail label="Employee code" value={employee.code} />
        <Detail label="Designation" value={employee.designation || "—"} />
        <Detail label="Department" value={employee.department || "—"} />
        <Detail label="Days present" value={String(payslip.presentDays)} />
        <Detail label="Days on leave" value={String(payslip.leaveDays)} />
        {employee.joinedAt ? <Detail label="Date of joining" value={formatDate(employee.joinedAt)} /> : null}
        {payslip.paidAt ? <Detail label="Paid on" value={formatDate(payslip.paidAt)} /> : null}
      </section>

      <div className="print-block mt-8 grid grid-cols-2 gap-6">
        <Column title="Earnings" rows={earnings} total={gross} totalLabel="Gross earnings" />
        <Column
          title="Deductions"
          rows={takeHome.length ? takeHome : [["Nil", 0]]}
          total={deductions}
          totalLabel="Total deductions"
        />
      </div>

      <div className="print-block mt-6 rounded-xl border-2 border-gold-600 bg-gold-50/60 p-5">
        <div className="flex items-baseline justify-between">
          <p className="font-display text-lg">Net pay</p>
          <p className="font-display text-2xl">{formatMoney(payslip.netPay)}</p>
        </div>
        <p className="mt-1 text-xs italic text-slate-600">Rupees {inWords(payslip.netPay)}</p>
      </div>

      {payslip.reference ? (
        <p className="mt-4 text-xs text-slate-600">Payment reference: {payslip.reference}</p>
      ) : null}
      {payslip.notes ? <p className="mt-1 text-xs text-slate-600">{payslip.notes}</p> : null}

      <p className="mt-12 border-t border-navy-900/10 pt-4 text-center text-[10px] text-slate-400">
        This is a computer-generated payslip and does not require a signature.
      </p>
    </div>
  );
}

function Detail({ label, value }: { label: string; value: string }) {
  return (
    <p className="flex justify-between gap-4">
      <span className="text-slate-500">{label}</span>
      <span className="font-medium">{value}</span>
    </p>
  );
}

function Column({
  title,
  rows,
  total,
  totalLabel,
}: {
  title: string;
  rows: [string, number][];
  total: number;
  totalLabel: string;
}) {
  return (
    <table className="w-full text-sm">
      <thead>
        <tr className="border-b border-navy-900/20 text-left">
          <th className="pb-2 font-display text-base font-normal">{title}</th>
          <th className="pb-2 text-right font-display text-base font-normal">Amount</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-navy-900/5">
        {rows.map(([label, value]) => (
          <tr key={label}>
            <td className="py-2 text-slate-600">{label}</td>
            <td className="py-2 text-right tabular-nums">{value ? formatMoney(value) : "—"}</td>
          </tr>
        ))}
      </tbody>
      <tfoot>
        <tr className="border-t border-navy-900/20">
          <td className="pt-2 font-medium">{totalLabel}</td>
          <td className="pt-2 text-right font-semibold tabular-nums">{formatMoney(total)}</td>
        </tr>
      </tfoot>
    </table>
  );
}
