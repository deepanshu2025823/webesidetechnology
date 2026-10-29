import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { reviewDay } from "@/app/admin/actions/activity";
import { Card, EmptyState, PageHeader, inputClass } from "@/components/admin/ui";
import { PendingButton } from "@/components/admin/PendingButton";
import { TARGET_MINUTES, addDays, dayKey, hours, isSunday, istDay, istTime, parseDayKey } from "@/lib/activity";
import { cn, formatDate } from "@/lib/utils";

/**
 * Who used the panel, for how long, and why the short days were short.
 *
 * Panel activity, not attendance: it only sees time spent in this admin tab,
 * so offline work, calls and meetings show as gaps — which is what the
 * reasons are for.
 */
export default async function ActivityReportPage({ searchParams }: { searchParams: Promise<{ from?: string; to?: string }> }) {
  const session = await requireModule("team");
  const params = await searchParams;
  const today = istDay();
  const to = (params.to && parseDayKey(params.to)) || today;
  let from = (params.from && parseDayKey(params.from)) || addDays(to, -6);
  if (from.getTime() > to.getTime()) from = addDays(to, -6);
  // A grid wider than a month stops being readable.
  if ((to.getTime() - from.getTime()) / 86_400_000 > 30) from = addDays(to, -30);

  const [users, rows] = await Promise.all([
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true }, orderBy: { name: "asc" } }),
    prisma.activityDay.findMany({
      where: { date: { gte: from, lte: to } },
      include: { user: { select: { name: true } }, reviewedBy: { select: { name: true } } },
      orderBy: { date: "desc" },
    }),
  ]);

  const days: Date[] = [];
  for (let d = from; d.getTime() <= to.getTime(); d = addDays(d, 1)) if (!isSunday(d)) days.push(d);
  const cell = new Map(rows.map((r) => [`${r.userId}|${dayKey(r.date)}`, r]));
  const pending = rows.filter((r) => r.reviewStatus === "PENDING");
  const editable = canEdit(session.role, "team");

  const summary = users.map((u) => {
    const own = days.map((d) => cell.get(`${u.id}|${dayKey(d)}`));
    const total = own.reduce((s, r) => s + (r?.activeMinutes ?? 0), 0);
    const counted = days.filter((d) => d.getTime() < today.getTime()).length || 1;
    const short = days.filter((d, i) => d.getTime() < today.getTime() && (own[i]?.activeMinutes ?? 0) < TARGET_MINUTES).length;
    const unexplained = days.filter(
      (d, i) => d.getTime() < today.getTime() && (own[i]?.activeMinutes ?? 0) < TARGET_MINUTES && !own[i]?.justification,
    ).length;
    return { user: u, total, avg: Math.round(total / counted), short, unexplained };
  });

  return (
    <>
      <PageHeader
        title="Activity tracking"
        description={`Active time in the admin panel per person per day (IST). Counted only while a tab is in front and in use; idle tabs stop the clock. Target ${hours(TARGET_MINUTES)} a day, Sundays excluded.`}
      />

      <form className="mb-6 flex flex-wrap items-end gap-3">
        <label className="text-xs text-slate-500">
          From
          <input type="date" name="from" defaultValue={dayKey(from)} className={`${inputClass} mt-1`} />
        </label>
        <label className="text-xs text-slate-500">
          To
          <input type="date" name="to" defaultValue={dayKey(to)} className={`${inputClass} mt-1`} />
        </label>
        <button type="submit" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
          Show
        </button>
        <Link href="/admin/hr/activity" className="px-2 py-2.5 text-sm text-slate-500 hover:text-navy-900">
          Last 7 days
        </Link>
      </form>

      {pending.length ? (
        <Card title={`Reasons waiting for review (${pending.length})`} className="mb-6">
          <ul className="divide-y divide-navy-900/5">
            {pending.map((r) => (
              <li key={r.id} className="flex flex-col gap-3 py-4 lg:flex-row lg:items-start">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy-900">
                    {r.user.name} · {formatDate(r.date, { weekday: "short", day: "numeric", month: "short" })} ·{" "}
                    <span className="text-red-600">{hours(r.activeMinutes)}</span>
                    <span className="text-slate-500"> of {hours(TARGET_MINUTES)}</span>
                  </p>
                  <p className="mt-1 text-sm text-slate-600">“{r.justification}”</p>
                </div>
                {editable && r.userId !== session.id ? (
                  <form action={reviewDay.bind(null, r.id)} className="flex flex-wrap items-center gap-2">
                    <input name="note" placeholder="Note (optional)" aria-label="Review note" className={`${inputClass} w-48 py-2 text-sm`} />
                    <PendingButton name="status" value="ACCEPTED" className="inline-flex items-center gap-1.5 rounded-lg bg-navy-900 px-3 py-2 text-xs font-semibold text-white hover:bg-navy-800">
                      Accept
                    </PendingButton>
                    <PendingButton name="status" value="REJECTED" className="inline-flex items-center gap-1.5 rounded-lg border border-navy-900/15 px-3 py-2 text-xs font-semibold text-navy-700 hover:bg-slate-50">
                      Reject
                    </PendingButton>
                  </form>
                ) : null}
              </li>
            ))}
          </ul>
        </Card>
      ) : null}

      {!rows.length ? (
        <EmptyState
          title="No activity recorded in this range"
          description="Time starts counting as soon as people use the panel after this update."
        />
      ) : null}

      <div className="mb-6 overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
        <div className="scroll-slim overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="sticky left-0 bg-slate-50 px-4 py-3 font-medium">Person</th>
                <th className="px-3 py-3 text-right font-medium">Total</th>
                <th className="px-3 py-3 text-right font-medium">Avg / day</th>
                <th className="px-3 py-3 text-right font-medium">Short days</th>
                {days.map((d) => (
                  <th key={dayKey(d)} className="whitespace-nowrap px-3 py-3 text-center font-medium">
                    {formatDate(d, { weekday: "short", day: "numeric" })}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-900/5">
              {summary.map(({ user, total, avg, short, unexplained }) => (
                <tr key={user.id}>
                  <td className="sticky left-0 whitespace-nowrap bg-white px-4 py-3 font-medium text-navy-900">{user.name}</td>
                  <td className="px-3 py-3 text-right text-navy-900">{hours(total)}</td>
                  <td className="px-3 py-3 text-right text-slate-600">{hours(avg)}</td>
                  <td className="px-3 py-3 text-right">
                    <span className={cn(short ? "text-red-600" : "text-slate-500")}>{short}</span>
                    {unexplained ? <span className="block text-[11px] text-slate-500">{unexplained} unexplained</span> : null}
                  </td>
                  {days.map((d) => {
                    const r = cell.get(`${user.id}|${dayKey(d)}`);
                    const m = r?.activeMinutes ?? 0;
                    const past = d.getTime() < today.getTime();
                    return (
                      <td
                        key={dayKey(d)}
                        title={r ? `${istTime(r.firstSeenAt)} – ${istTime(r.lastSeenAt)}${r.justification ? `\nReason: ${r.justification}` : ""}` : "No activity"}
                        className={cn(
                          "whitespace-nowrap px-3 py-3 text-center text-xs",
                          m >= TARGET_MINUTES
                            ? "bg-emerald-50 text-emerald-800"
                            : past
                              ? m
                                ? "bg-gold-50 text-gold-800"
                                : "bg-red-50/60 text-red-700"
                              : "text-slate-600",
                        )}
                      >
                        {m ? hours(m) : "—"}
                        {r?.justification ? (
                          <span className="block text-[10px] uppercase tracking-wide opacity-70">
                            {r.reviewStatus === "PENDING" ? "reason" : r.reviewStatus.toLowerCase()}
                          </span>
                        ) : null}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      <p className="text-xs text-slate-500">
        Green: target met · Gold: short · Red: nothing recorded. Hover a cell for first and last activity and the reason given.
      </p>
    </>
  );
}
