"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { Bell, CheckCheck } from "lucide-react";
import { markAllNotificationsRead, markNotificationRead } from "@/app/admin/actions/alerts";
import { cn, formatDate } from "@/lib/utils";

export type NotificationRow = {
  id: string;
  title: string;
  body: string | null;
  url: string;
  isRead: boolean;
  createdAt: string;
};

export function NotificationBell({ items, unread }: { items: NotificationRow[]; unread: number }) {
  const [open, setOpen] = useState(false);
  const [, startTransition] = useTransition();

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-label={unread ? `${unread} unread notifications` : "Notifications"}
        aria-expanded={open}
        className="relative grid size-10 place-items-center rounded-xl border border-navy-900/10 bg-white text-navy-700 transition-colors hover:border-gold-500 hover:text-gold-700"
      >
        <Bell className="size-4.5" />
        {unread ? (
          <span className="absolute -right-1 -top-1 grid min-w-5 place-items-center rounded-full bg-gold-600 px-1 text-[10px] font-semibold text-navy-950">
            {unread > 99 ? "99+" : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} aria-hidden />
          <div className="absolute right-0 z-40 mt-2 w-80 overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-brand">
            <div className="flex items-center justify-between border-b border-navy-900/10 px-4 py-3">
              <p className="text-sm font-semibold text-navy-900">Notifications</p>
              {unread ? (
                <button
                  type="button"
                  onClick={() => startTransition(() => void markAllNotificationsRead())}
                  className="inline-flex items-center gap-1 text-xs font-medium text-gold-700 hover:text-gold-900"
                >
                  <CheckCheck className="size-3.5" aria-hidden /> Mark all read
                </button>
              ) : null}
            </div>

            <ul className="scroll-slim max-h-96 divide-y divide-navy-900/5 overflow-y-auto">
              {items.length ? (
                items.map((item) => (
                  <li key={item.id}>
                    <Link
                      href={item.url || "/admin"}
                      onClick={() => {
                        setOpen(false);
                        if (!item.isRead) startTransition(() => void markNotificationRead(item.id));
                      }}
                      className={cn("block px-4 py-3 hover:bg-slate-50", !item.isRead && "bg-gold-50/50")}
                    >
                      <p className="text-sm font-medium text-navy-900">{item.title}</p>
                      {item.body ? <p className="mt-0.5 text-xs text-slate-600">{item.body}</p> : null}
                      <p className="mt-1 text-[11px] text-slate-400">
                        {formatDate(item.createdAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}
                      </p>
                    </Link>
                  </li>
                ))
              ) : (
                <li className="px-4 py-10 text-center text-sm text-slate-500">Nothing to catch up on.</li>
              )}
            </ul>
          </div>
        </>
      ) : null}
    </div>
  );
}
