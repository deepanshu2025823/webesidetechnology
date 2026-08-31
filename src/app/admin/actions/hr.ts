"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity, requirePermission } from "@/lib/auth";
import { alertLeaveRequest } from "@/lib/alerts";
import { notify } from "@/lib/notify";
import type { ActionState } from "@/app/admin/actions/collections";

export type { ActionState };

const str = (f: FormData, k: string) => String(f.get(k) ?? "").trim();
const int = (f: FormData, k: string, fallback = 0) => {
  const raw = str(f, k).replace(/,/g, "");
  if (!raw) return fallback;
  const n = Number(raw);
  return Number.isFinite(n) ? Math.round(n) : fallback;
};
const date = (f: FormData, k: string) => {
  const raw = str(f, k);
  return raw ? new Date(raw) : null;
};

function dayOnly(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate());
}

function monthStart(value: string) {
  const [year, month] = value.split("-").map(Number);
  return new Date(year, (month ?? 1) - 1, 1);
}

// ------------------------------------------------------------------ attendance

/**
 * Attendance is always an explicit record — self, manager or system — never
 * inferred from device activity alone. Scope section 14 is specific about that,
 * and manager correction has to remain possible.
 */
export async function markAttendance(form: FormData): Promise<void> {
  const session = await requirePermission("team", "write");
  const employeeId = str(form, "employeeId");
  const day = date(form, "date");
  if (!employeeId || !day) return;

  const status = str(form, "status") || "PRESENT";
  const checkIn = str(form, "checkIn");
  const checkOut = str(form, "checkOut");

  const toTime = (value: string) => {
    if (!value) return null;
    const [h, m] = value.split(":").map(Number);
    const d = new Date(day);
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    return d;
  };

  const inAt = toTime(checkIn);
  const outAt = toTime(checkOut);
  const workedMinutes = inAt && outAt ? Math.max(0, Math.round((outAt.getTime() - inAt.getTime()) / 60000)) : 0;

  const data = {
    employeeId,
    date: dayOnly(day),
    checkIn: inAt,
    checkOut: outAt,
    status: status as never,
    source: (str(form, "source") || "MANAGER") as never,
    workedMinutes,
    notes: str(form, "notes") || null,
    approvedById: session.id,
  };

  await prisma.attendance.upsert({
    where: { employeeId_date: { employeeId, date: dayOnly(day) } },
    create: data,
    update: data,
  });

  revalidatePath("/admin/hr/attendance");
}

export async function deleteAttendance(id: string): Promise<void> {
  await requirePermission("team", "write");
  await prisma.attendance.delete({ where: { id } });
  revalidatePath("/admin/hr/attendance");
}

// ------------------------------------------------------------------ leave

export async function requestLeave(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("team", "read");
  const employeeId = str(form, "employeeId");
  const from = date(form, "fromDate");
  const to = date(form, "toDate");
  const reason = str(form, "reason");

  if (!employeeId || !from || !to) return { error: "Pick the employee and the dates." };
  if (!reason) return { error: "Add a reason." };

  const days = Math.max(1, Math.round((to.getTime() - from.getTime()) / 86_400_000) + 1);

  const leave = await prisma.leaveRequest.create({
    data: {
      employeeId,
      type: (str(form, "type") || "CASUAL") as never,
      fromDate: from,
      toDate: to,
      days,
      reason,
    },
  });

  await alertLeaveRequest(leave.id);
  await logActivity(session.id, "create", "LeaveRequest", employeeId, `${days} day(s)`);
  revalidatePath("/admin/hr/leave");
  return { ok: true, message: "Leave request submitted." };
}

export async function decideLeave(id: string, form: FormData): Promise<void> {
  const session = await requirePermission("team", "write");
  const status = str(form, "status");

  const request = await prisma.leaveRequest.update({
    where: { id },
    data: { status: status as never, decidedById: session.id, decidedAt: new Date() },
    include: { employee: { select: { name: true, userId: true } } },
  });

  // Approved leave writes the attendance days so payroll stays consistent.
  if (status === "APPROVED") {
    for (let d = new Date(request.fromDate); d <= request.toDate; d.setDate(d.getDate() + 1)) {
      const day = dayOnly(d);
      await prisma.attendance.upsert({
        where: { employeeId_date: { employeeId: request.employeeId, date: day } },
        create: { employeeId: request.employeeId, date: day, status: "LEAVE", source: "SYSTEM", approvedById: session.id },
        update: { status: "LEAVE", source: "SYSTEM", approvedById: session.id },
      });
    }
  }

  if (request.employee.userId) {
    await notify({
      userIds: [request.employee.userId],
      type: "leave_decision",
      title: `Leave ${status.toLowerCase()}`,
      body: `${request.days} day(s) from ${request.fromDate.toDateString()}.`,
      url: "/admin/hr/leave",
      entity: "LeaveRequest",
      entityId: id,
    });
  }

  await logActivity(session.id, "update", "LeaveRequest", id, status);
  revalidatePath("/admin/hr/leave");
  revalidatePath("/admin/hr/attendance");
}

// ------------------------------------------------------------------ payroll

export async function saveSalaryStructure(form: FormData): Promise<void> {
  const session = await requirePermission("payroll", "write");
  const employeeId = str(form, "employeeId");
  const effectiveFrom = date(form, "effectiveFrom");
  if (!employeeId || !effectiveFrom) return;

  const basic = int(form, "basic");
  const hra = int(form, "hra");
  const allowances = int(form, "allowances");
  const deductions = int(form, "deductions");

  await prisma.salaryStructure.create({
    data: {
      employeeId,
      effectiveFrom,
      basic,
      hra,
      allowances,
      deductions,
      ctc: basic + hra + allowances,
      notes: str(form, "notes") || null,
    },
  });

  await logActivity(session.id, "create", "SalaryStructure", employeeId);
  revalidatePath("/admin/hr/payroll");
}

/**
 * Builds draft payslips for a month from the current salary structure and the
 * attendance already recorded. Nothing is paid automatically — a human still
 * approves and marks each one paid.
 */
export async function generatePayslips(_prev: ActionState, form: FormData): Promise<ActionState> {
  const session = await requirePermission("payroll", "write");
  const monthRaw = str(form, "month");
  if (!monthRaw) return { error: "Pick a month." };

  const month = monthStart(monthRaw);
  const next = new Date(month);
  next.setMonth(next.getMonth() + 1);

  const employees = await prisma.employee.findMany({
    where: { isActive: true },
    include: {
      salaries: { orderBy: { effectiveFrom: "desc" }, take: 1 },
      attendance: { where: { date: { gte: month, lt: next } } },
      incentives: { where: { status: "APPROVED", month: { gte: month, lt: next } } },
    },
  });

  let created = 0;
  for (const employee of employees) {
    const structure = employee.salaries[0];
    if (!structure) continue;

    const present = employee.attendance.filter((a) => a.status === "PRESENT").length;
    const half = employee.attendance.filter((a) => a.status === "HALF_DAY").length;
    const leave = employee.attendance.filter((a) => a.status === "LEAVE").length;
    const incentives = employee.incentives.reduce((sum, i) => sum + i.amount, 0);

    const fixedPay = structure.ctc;
    const netPay = fixedPay + incentives - structure.deductions;

    await prisma.payslip.upsert({
      where: { employeeId_month: { employeeId: employee.id, month } },
      create: {
        employeeId: employee.id,
        month,
        fixedPay,
        incentives,
        deductions: structure.deductions,
        netPay,
        presentDays: present + Math.floor(half / 2),
        leaveDays: leave,
      },
      update: {
        fixedPay,
        incentives,
        deductions: structure.deductions,
        netPay,
        presentDays: present + Math.floor(half / 2),
        leaveDays: leave,
      },
    });
    created += 1;
  }

  await logActivity(session.id, "create", "Payslip", undefined, `${created} payslip(s) for ${monthRaw}`);
  revalidatePath("/admin/hr/payroll");
  return { ok: true, message: `${created} payslip(s) prepared.` };
}

export async function setPayslipStatus(id: string, form: FormData): Promise<void> {
  const session = await requirePermission("payroll", "write");
  const status = str(form, "status");

  await prisma.payslip.update({
    where: { id },
    data: {
      status: status as never,
      paidAt: status === "PAID" ? new Date() : null,
      reference: str(form, "reference") || undefined,
    },
  });

  await logActivity(session.id, "update", "Payslip", id, status);
  revalidatePath("/admin/hr/payroll");
}

export async function saveIncentive(form: FormData): Promise<void> {
  const session = await requirePermission("payroll", "write");
  const employeeId = str(form, "employeeId");
  const amount = int(form, "amount");
  const reason = str(form, "reason");
  if (!employeeId || amount <= 0 || !reason) return;

  await prisma.incentive.create({
    data: {
      employeeId,
      type: (str(form, "type") || "PROJECT_BONUS") as never,
      amount,
      reason,
      month: date(form, "month"),
      status: "APPROVED",
    },
  });

  await logActivity(session.id, "create", "Incentive", employeeId, reason);
  revalidatePath("/admin/hr/payroll");
}
