import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { UsersManager } from "@/components/admin/UsersManager";

export default async function UsersPage() {
  const session = await getSession();
  if (!session || !canEdit(session.role, "users")) redirect("/admin");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <>
      <PageHeader title="Team access" description="Who can sign in, and which parts of the panel they can reach." />
      <UsersManager
        currentUserId={session.id}
        users={users.map((u) => ({
          id: u.id,
          name: u.name,
          email: u.email,
          role: u.role,
          isActive: u.isActive,
          lastLoginAt: u.lastLoginAt ? u.lastLoginAt.toISOString() : null,
        }))}
      />
    </>
  );
}
