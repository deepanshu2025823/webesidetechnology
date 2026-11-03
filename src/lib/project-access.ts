import "server-only";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { SessionUser } from "@/lib/auth";
import { isOwnScoped } from "@/lib/permissions";

/** A project someone manages, is a member of, or holds a task on. */
export function assignedTo(userId: string) {
  return {
    OR: [
      { managerId: userId },
      { members: { some: { userId } } },
      { tasks: { some: { assigneeId: userId } } },
    ],
  };
}

/**
 * For people limited to their own projects: a project they are not on does
 * not exist as far as they are concerned, even by direct link.
 */
export async function requireProjectAccess(session: SessionUser, projectId: string) {
  if (!isOwnScoped(session, "projects")) return;
  const allowed = await prisma.clientProject.count({ where: { id: projectId, ...assignedTo(session.id) } });
  if (!allowed) notFound();
}
