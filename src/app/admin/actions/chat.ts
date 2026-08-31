"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity, requirePermission } from "@/lib/auth";

/**
 * The team's half of the live chat. The visitor half lives in /api/chat, which
 * is public and token-scoped; everything here requires a signed-in agent.
 */

/** Take ownership of a waiting conversation and greet the visitor. */
export async function joinChat(id: string): Promise<void> {
  const session = await requirePermission("chats", "write");

  const chat = await prisma.chatSession.findUnique({ where: { id }, select: { closedAt: true } });
  if (!chat || chat.closedAt) return;

  await prisma.chatSession.update({
    where: { id },
    data: {
      status: "WITH_AGENT",
      agentId: session.id,
      unreadForAgent: 0,
      lastMessageAt: new Date(),
      messages: {
        create: {
          role: "AGENT",
          authorId: session.id,
          body: `${session.name} has joined the chat. How can I help?`,
        },
      },
    },
  });

  await logActivity(session.id, "join", "ChatSession", id);
  revalidatePath("/admin/chats");
  revalidatePath(`/admin/chats/${id}`);
}

export async function replyToChat(id: string, form: FormData): Promise<void> {
  const session = await requirePermission("chats", "write");
  const body = String(form.get("body") ?? "").trim().slice(0, 2000);
  if (!body) return;

  await prisma.chatSession.update({
    where: { id },
    data: {
      // Replying implies joining, for anyone who skipped the button.
      status: "WITH_AGENT",
      agentId: session.id,
      unreadForAgent: 0,
      lastMessageAt: new Date(),
      messages: { create: { role: "AGENT", authorId: session.id, body } },
    },
  });

  revalidatePath(`/admin/chats/${id}`);
}

export async function closeChat(id: string): Promise<void> {
  const session = await requirePermission("chats", "write");

  await prisma.chatSession.update({
    where: { id },
    data: {
      status: "CLOSED",
      closedAt: new Date(),
      messages: { create: { role: "BOT", body: "This conversation has been closed. Thanks for getting in touch!" } },
    },
  });

  await logActivity(session.id, "close", "ChatSession", id);
  revalidatePath("/admin/chats");
  revalidatePath(`/admin/chats/${id}`);
}

/** Clears the unread badge when an agent opens the thread. */
export async function markChatRead(id: string): Promise<void> {
  await requirePermission("chats", "read");
  await prisma.chatSession.update({ where: { id }, data: { unreadForAgent: 0 } });
  revalidatePath("/admin/chats");
}
