"use client";

import { useTransition } from "react";
import { Trash2 } from "lucide-react";
import { deletePortalUser } from "@/app/admin/actions/portal";
import { Badge } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";

export function PortalUserRow({
  user,
  editable,
}: {
  user: { id: string; name: string; email: string; clientName: string; isActive: boolean; lastLoginAt: string | null };
  editable: boolean;
}) {
  const [, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-3 py-2.5 text-sm">
      <span className="min-w-0 flex-1">
        <span className="block font-medium text-navy-900">{user.name}</span>
        <span className="block truncate text-xs text-slate-500">
          {user.email} · {user.clientName}
        </span>
      </span>

      <span className="shrink-0 text-xs text-slate-400">
        {user.lastLoginAt ? formatDate(user.lastLoginAt) : "never signed in"}
      </span>

      {user.isActive ? <Badge tone="success">active</Badge> : <Badge tone="muted">disabled</Badge>}

      {editable ? (
        <button
          type="button"
          onClick={() => startTransition(() => void deletePortalUser(user.id))}
          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
          aria-label={`Remove ${user.name}`}
        >
          <Trash2 className="size-3.5" />
        </button>
      ) : null}
    </li>
  );
}
