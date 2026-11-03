import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { canEdit } from "@/lib/permissions";
import { PageHeader } from "@/components/admin/ui";
import { UsersManager } from "@/components/admin/UsersManager";

export default async function UsersPage() {
  const session = await getSession();
  if (!session || !canEdit(session, "users")) redirect("/admin");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <>
      <PageHeader
        title="Team access"
        description="Who can sign in, and which parts of the panel they can reach."
        actions={
          <Link
            href="/admin/users/permissions"
            className="inline-flex items-center gap-2 rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-semibold text-navy-800 hover:border-gold-500 hover:bg-gold-50"
          >
            <ShieldCheck className="size-4" aria-hidden /> Permissions
          </Link>
        }
      />
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
