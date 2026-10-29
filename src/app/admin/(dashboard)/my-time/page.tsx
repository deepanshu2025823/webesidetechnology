import { prisma } from "@/lib/prisma";
import { requireSession } from "@/lib/auth";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { JustifyForm } from "@/components/admin/JustifyForm";
import { TARGET_MINUTES, addDays, dayKey, hours, isSunday, istDay, istTime } from "@/lib/activity";
import { cn, formatDate } from "@/lib/utils";

const REVIEW_TONE = { PENDING: "warn", ACCEPTED: "success", REJECTED: "muted", NONE: "neutral" } as const;

/** A person's own last two weeks of panel time, with a reason box for short days. */
export default async function MyTimePage() {
  const session = await requireSession();
  const today = istDay();
  const from = addDays(today, -13);

  const rows = await prisma.activityDay.findMany({
    where: { userId: session.id, date: { gte: from, lte: today } },
    include: { reviewedBy: { select: { name: true } } },
  });
  const byDay = new Map(rows.map((r) => [dayKey(r.date), r]));

  const days = Array.from({ length: 14 }, (_, i) => addDays(today, -i)).filter((d) => !isSunday(d));
  const week = days.filter((d) => d.getTime() > addDays(today, -7).getTime());
  const weekMinutes = week.reduce((sum, d) => sum + (byDay.get(dayKey(d))?.activeMinutes ?? 0), 0);
  const todayRow = byDay.get(dayKey(today));
  const owed = days.filter((d) => {
    const r = byDay.get(dayKey(d));
    return d.getTime() < today.getTime() && (r?.activeMinutes ?? 0) < TARGET_MINUTES && (!r?.justification || r.reviewStatus === "REJECTED");
  }).length;

  return (
    <>
      <PageHeader
        title="My time"
        description={`Time you actively used this panel, counted while the tab is open and you are typing or moving the mouse. The daily target is ${hours(TARGET_MINUTES)}.`}
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card title="Today">
          <p className="font-display text-3xl text-navy-900">{hours(todayRow?.activeMinutes ?? 0)}</p>
          <p className="mt-1 text-xs text-slate-500">
            {todayRow ? `since ${istTime(todayRow.firstSeenAt)}, last active ${istTime(todayRow.lastSeenAt)}` : "Nothing counted yet today."}
          </p>
        </Card>
        <Card title="Last 7 days">
          <p className="font-display text-3xl text-navy-900">{hours(weekMinutes)}</p>
          <p className="mt-1 text-xs text-slate-500">target {hours(TARGET_MINUTES * week.length)}</p>
        </Card>
        <Card title="Reasons needed">
          <p className={cn("font-display text-3xl", owed ? "text-red-600" : "text-navy-900")}>{owed}</p>
          <p className="mt-1 text-xs text-slate-500">short days without an accepted reason</p>
        </Card>
      </div>

      <Card title="Last two weeks" description="Sundays are left out. Today can be explained once it is over.">
        <ul className="divide-y divide-navy-900/5">
          {days.map((d) => {
            const r = byDay.get(dayKey(d));
            const minutes = r?.activeMinutes ?? 0;
            const short = minutes < TARGET_MINUTES;
            const past = d.getTime() < today.getTime();
            const pct = Math.min(100, Math.round((minutes / TARGET_MINUTES) * 100));
            return (
              <li key={dayKey(d)} className="py-4">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="w-36 text-sm font-medium text-navy-900">
                    {formatDate(d, { weekday: "short", day: "numeric", month: "short" })}
                  </span>
                  <span className="h-2 w-40 rounded-full bg-slate-100">
                    <span className={cn("block h-2 rounded-full", short ? "bg-gold-500" : "bg-emerald-500")} style={{ width: `${pct}%` }} />
                  </span>
                  <span className={cn("text-sm", short && past ? "font-semibold text-red-600" : "text-navy-900")}>{hours(minutes)}</span>
                  {r ? <span className="text-xs text-slate-500">{istTime(r.firstSeenAt)} – {istTime(r.lastSeenAt)}</span> : null}
                  {short && past ? <span className="text-xs text-slate-500">short by {hours(TARGET_MINUTES - minutes)}</span> : null}
                  {r?.justification ? (
                    <Badge tone={REVIEW_TONE[(r.reviewStatus as keyof typeof REVIEW_TONE) ?? "NONE"] ?? "neutral"}>
                      {r.reviewStatus === "PENDING" ? "reason sent" : r.reviewStatus.toLowerCase()}
                    </Badge>
                  ) : null}
                </div>
                {r?.justification ? (
                  <p className="mt-2 text-sm text-slate-600">
                    “{r.justification}”
                    {r.reviewNote ? <span className="block text-xs text-slate-500">{r.reviewedBy?.name ?? "Reviewer"}: {r.reviewNote}</span> : null}
                  </p>
                ) : null}
                {short && past && r?.reviewStatus !== "ACCEPTED" ? (
                  <JustifyForm date={dayKey(d)} defaultValue={r?.justification} />
                ) : null}
              </li>
            );
          })}
        </ul>
      </Card>
    </>
  );
}
