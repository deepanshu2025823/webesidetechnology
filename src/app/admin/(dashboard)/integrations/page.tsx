import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { runAutomationNow } from "@/app/admin/actions/integrations";
import { PROVIDERS } from "@/lib/admin/providers";
import { IntegrationCard } from "@/components/admin/IntegrationCard";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

const TONE = { QUEUED: "neutral", SENT: "success", DELIVERED: "success", READ: "success", FAILED: "warn", SKIPPED: "muted" } as const;
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

export default async function IntegrationsPage() {
  const session = await requireModule("integrations");

  const [settings, logs, templates] = await Promise.all([
    prisma.integrationSetting.findMany(),
    prisma.messageLog.findMany({ orderBy: { createdAt: "desc" }, take: 25 }),
    prisma.messageTemplate.count(),
  ]);

  const byProvider = new Map(settings.map((s) => [s.provider, s]));
  const editable = canEdit(session.role, "integrations");
  const smtpConfigured = Boolean(process.env.SMTP_HOST && process.env.SMTP_USER);

  return (
    <>
      <PageHeader
        title="Integrations"
        description="Provider credentials, message delivery logs and the nightly automation."
        actions={
          editable ? (
            <form action={runAutomationNow}>
              <button
                type="submit"
                className="rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
              >
                Run automation now
              </button>
            </form>
          ) : null
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-500">Email</p>
          <p className="mt-1 font-medium text-navy-900">
            {smtpConfigured ? "Configured" : "Not configured"}{" "}
            <Badge tone={smtpConfigured ? "success" : "warn"}>{smtpConfigured ? "live" : "set SMTP_*"}</Badge>
          </p>
          <p className="mt-1 text-xs text-slate-500">Set through environment variables.</p>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-500">Message templates</p>
          <p className="mt-1 font-medium text-navy-900">{templates}</p>
          <Link href="/admin/message-templates" className="mt-1 block text-xs font-semibold text-gold-700 hover:text-gold-900">
            Manage templates →
          </Link>
        </Card>
        <Card>
          <p className="text-xs uppercase tracking-wide text-slate-500">Nightly automation</p>
          <p className="mt-1 font-medium text-navy-900">/api/cron/daily</p>
          <p className="mt-1 text-xs text-slate-500">
            Point a scheduler here once a day. Protect it with <code>CRON_SECRET</code>.
          </p>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        {PROVIDERS.map((provider) => (
          <IntegrationCard
            key={provider.key}
            provider={provider.key}
            label={provider.label}
            fields={[...provider.fields]}
            editable={editable}
            saved={
              byProvider.get(provider.key)
                ? {
                    isEnabled: byProvider.get(provider.key)!.isEnabled,
                    config: (byProvider.get(provider.key)!.config ?? {}) as Record<string, string>,
                  }
                : null
            }
          />
        ))}
      </div>

      <Card title="Recent messages" className="mt-6">
        {logs.length ? (
          <ul className="divide-y divide-navy-900/5">
            {logs.map((log) => (
              <li key={log.id} className="flex items-center gap-3 py-2.5 text-sm">
                <Badge tone="neutral">{pretty(log.channel)}</Badge>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-navy-900">{log.subject || log.toAddress}</span>
                  <span className="block truncate text-xs text-slate-500">
                    {log.toAddress}
                    {log.error ? ` — ${log.error}` : ""}
                  </span>
                </span>
                <Badge tone={TONE[log.status]}>{pretty(log.status)}</Badge>
                <span className="shrink-0 text-xs text-slate-400">{formatDate(log.createdAt)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-slate-500">Nothing sent yet.</p>
        )}
      </Card>
    </>
  );
}
