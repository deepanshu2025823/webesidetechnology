import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Sidebar } from "@/components/admin/Sidebar";
import { NotificationBell } from "@/components/admin/NotificationBell";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session) redirect("/admin/login");

  const [notifications, unread] = await Promise.all([
    prisma.notification.findMany({
      where: { userId: session.id },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.notification.count({ where: { userId: session.id, isRead: false } }),
  ]);

  return (
    <div className="lg:flex">
      <Sidebar user={{ name: session.name, email: session.email, role: session.role }} />
      <div className="min-w-0 flex-1">
        <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 lg:px-8 lg:py-10">
          <div className="mb-2 flex justify-end lg:-mt-4">
            <NotificationBell
              unread={unread}
              items={notifications.map((n) => ({
                id: n.id,
                title: n.title,
                body: n.body,
                url: n.url,
                isRead: n.isRead,
                createdAt: n.createdAt.toISOString(),
              }))}
            />
          </div>
          {children}
        </div>
      </div>
    </div>
  );
}
