import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Globe, Mail, Phone, Target, UserCheck } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireModule } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { closeChat, joinChat, markChatRead, replyToChat } from "@/app/admin/actions/chat";
import { Badge, Card, PageHeader } from "@/components/admin/ui";
import { ChatThread } from "@/components/admin/ChatThread";
import { formatDate } from "@/lib/utils";

const TONE = { WAITING_AGENT: "warn", WITH_AGENT: "success", BOT: "neutral", CLOSED: "muted" } as const;

export default async function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireModule("chats");
  const { id } = await params;

  const chat = await prisma.chatSession.findUnique({
    where: { id },
    include: {
      agent: { select: { name: true } },
      messages: { orderBy: { createdAt: "asc" }, include: { author: { select: { name: true } } } },
    },
  });
  if (!chat) notFound();

  // Opening the thread is what clears the badge for everyone else.
  if (chat.unreadForAgent) await markChatRead(id);

  const editable = canEdit(session.role, "chats");
  const closed = chat.status === "CLOSED" || Boolean(chat.closedAt);

  const reply = replyToChat.bind(null, id);
  const join = joinChat.bind(null, id);
  const close = closeChat.bind(null, id);

  const lead = chat.leadId ? await prisma.enquiry.findUnique({ where: { id: chat.leadId }, select: { id: true, name: true } }) : null;

  const facts = [
    chat.visitorEmail && { icon: Mail, label: "Email", value: chat.visitorEmail, href: `mailto:${chat.visitorEmail}` },
    chat.visitorPhone && { icon: Phone, label: "Phone", value: chat.visitorPhone, href: `tel:${chat.visitorPhone}` },
    chat.pageUrl && { icon: Globe, label: "Started on", value: chat.pageUrl },
  ].filter(Boolean) as { icon: typeof Mail; label: string; value: string; href?: string }[];

  return (
    <>
      <Link href="/admin/chats" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> All conversations
      </Link>

      <PageHeader
        title={chat.visitorName || "Anonymous visitor"}
        description={`Started ${formatDate(chat.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}`}
        actions={
          editable && !closed ? (
            <>
              {chat.status !== "WITH_AGENT" ? (
                <form action={join}>
                  <button
                    type="submit"
                    className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
                  >
                    <UserCheck className="size-4" aria-hidden /> Join the chat
                  </button>
                </form>
              ) : null}
              <form action={close}>
                <button
                  type="submit"
                  className="rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-medium text-navy-800 hover:bg-slate-50"
                >
                  Close
                </button>
              </form>
            </>
          ) : null
        }
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChatThread
            token={chat.token}
            closed={closed || !editable}
            onSend={reply}
            initial={chat.messages.map((m) => ({
              id: m.id,
              role: m.role,
              body: m.body,
              at: m.createdAt.toISOString(),
              author: m.author?.name ?? null,
            }))}
          />
        </div>

        <div className="space-y-6">
          <Card title="Visitor">
            <div className="space-y-4">
              <Badge tone={TONE[chat.status]}>
                {chat.status === "WITH_AGENT" ? `With ${chat.agent?.name ?? "an agent"}` : chat.status.replace(/_/g, " ").toLowerCase()}
              </Badge>

              {facts.length ? (
                <ul className="space-y-3">
                  {facts.map((fact) => (
                    <li key={fact.label} className="flex items-start gap-3">
                      <fact.icon className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden />
                      <span className="min-w-0">
                        <span className="block text-xs text-slate-500">{fact.label}</span>
                        {fact.href ? (
                          <a href={fact.href} className="block break-words text-sm text-navy-900 hover:text-gold-700">
                            {fact.value}
                          </a>
                        ) : (
                          <span className="block break-words text-sm text-navy-900">{fact.value}</span>
                        )}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-sm text-slate-500">
                  They have not left contact details. Ask for a phone number or email in the thread.
                </p>
              )}
            </div>
          </Card>

          {lead ? (
            <Card title="Lead">
              <Link
                href={`/admin/leads/${lead.id}`}
                className="inline-flex items-center gap-2 text-sm font-medium text-gold-700 hover:underline"
              >
                <Target className="size-4" aria-hidden /> {lead.name}
              </Link>
              <p className="mt-2 text-xs text-slate-500">
                Captured automatically when they asked to speak to a person.
              </p>
            </Card>
          ) : null}
        </div>
      </div>
    </>
  );
}
