import Link from "next/link";
import { MessageCircle } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { Badge, EmptyState, PageHeader } from "@/components/admin/ui";
import { cn, formatDate } from "@/lib/utils";

const FILTERS = [
  { key: "OPEN", label: "Needs attention" },
  { key: "WAITING_AGENT", label: "Waiting" },
  { key: "WITH_AGENT", label: "With an agent" },
  { key: "BOT", label: "Bot only" },
  { key: "CLOSED", label: "Closed" },
  { key: "ALL", label: "All" },
];

const TONE = { WAITING_AGENT: "warn", WITH_AGENT: "success", BOT: "neutral", CLOSED: "muted" } as const;

/** Relative time is what matters on a live queue — "4m ago", not a date. */
function ago(date: Date) {
  const minutes = Math.floor((Date.now() - date.getTime()) / 60_000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  return formatDate(date);
}

export default async function ChatsPage({ searchParams }: { searchParams: Promise<{ status?: string; q?: string }> }) {
  await requireModule("chats");
  const { status, q } = await searchParams;
  const active = status ?? "OPEN";
  const term = q?.trim();

  const chats = await prisma.chatSession.findMany({
    where: {
      ...(active === "OPEN"
        ? { status: { in: ["WAITING_AGENT", "WITH_AGENT"] } }
        : active !== "ALL"
          ? { status: active as never }
          : {}),
      ...(term
        ? {
            OR: [
              { visitorName: { contains: term } },
              { visitorEmail: { contains: term } },
              { visitorPhone: { contains: term } },
              { messages: { some: { body: { contains: term } } } },
            ],
          }
        : {}),
    },
    orderBy: [{ unreadForAgent: "desc" }, { lastMessageAt: "desc" }],
    take: 200,
    include: {
      agent: { select: { name: true } },
      messages: { orderBy: { createdAt: "desc" }, take: 1 },
      _count: { select: { messages: true } },
    },
  });

  const waiting = await prisma.chatSession.count({ where: { status: "WAITING_AGENT" } });

  return (
    <>
      <PageHeader
        title="Live chat"
        description={
          waiting
            ? `${waiting} visitor${waiting === 1 ? "" : "s"} waiting for someone from the team.`
            : "Conversations from the website assistant, including anyone who asked for a person."
        }
      />

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={`/admin/chats?status=${f.key}${term ? `&q=${encodeURIComponent(term)}` : ""}`}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors",
              active === f.key
                ? "bg-navy-900 text-white"
                : "border border-navy-900/15 text-navy-700 hover:border-gold-500 hover:bg-gold-50",
            )}
          >
            {f.label}
            {f.key === "WAITING_AGENT" && waiting ? ` (${waiting})` : ""}
          </Link>
        ))}

        <form className="ml-auto" action="/admin/chats">
          <input type="hidden" name="status" value={active} />
          <input
            name="q"
            defaultValue={term ?? ""}
            placeholder="Search visitors and messages…"
            aria-label="Search chats"
            className="w-64 rounded-full border border-navy-900/15 px-4 py-1.5 text-sm focus:border-gold-500 focus:outline-none"
          />
        </form>
      </div>

      {chats.length === 0 ? (
        <EmptyState
          title={term ? `Nothing matches “${term}”` : "No conversations here"}
          description={
            term ? "Try a shorter search." : "Chats from the website assistant appear here as soon as they start."
          }
        />
      ) : (
        <ul className="space-y-2">
          {chats.map((chat) => (
            <li key={chat.id}>
              <Link
                href={`/admin/chats/${chat.id}`}
                className={cn(
                  "flex items-start gap-4 rounded-2xl border bg-white px-5 py-4 transition-colors hover:border-gold-400",
                  chat.unreadForAgent ? "border-gold-400 bg-gold-50/40" : "border-navy-900/10",
                )}
              >
                <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-navy-900 text-gold-400">
                  <MessageCircle className="size-4" aria-hidden />
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className="font-medium text-navy-900">{chat.visitorName || "Anonymous visitor"}</span>
                    <Badge tone={TONE[chat.status]}>
                      {chat.status === "WAITING_AGENT"
                        ? "waiting"
                        : chat.status === "WITH_AGENT"
                          ? `with ${chat.agent?.name ?? "an agent"}`
                          : chat.status.toLowerCase()}
                    </Badge>
                    {chat.unreadForAgent ? <Badge tone="warn">{chat.unreadForAgent} new</Badge> : null}
                  </span>

                  <span className="mt-1 block truncate text-sm text-slate-500">
                    {chat.messages[0]?.body ?? "No messages yet"}
                  </span>

                  <span className="mt-1 block text-xs text-slate-400">
                    {[chat.visitorEmail, chat.visitorPhone].filter(Boolean).join(" · ") || chat.pageUrl || "—"}
                  </span>
                </span>

                <span className="shrink-0 text-right text-xs text-slate-400">
                  <span className="block">{ago(chat.lastMessageAt)}</span>
                  <span className="block">{chat._count.messages} messages</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}
