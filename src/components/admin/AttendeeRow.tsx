"use client";

import { useTransition } from "react";
import { setAttendeeStatus } from "@/app/admin/actions/events";
import { Badge } from "@/components/admin/ui";

const STATUSES = ["REGISTERED", "CONFIRMED", "ATTENDED", "NO_SHOW", "CANCELLED"];
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export function AttendeeRow({
  attendee,
  editable,
}: {
  attendee: { id: string; name: string; email: string; company: string; status: string };
  editable: boolean;
}) {
  const [, startTransition] = useTransition();

  return (
    <li className="flex items-center gap-3 py-2.5">
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium text-navy-900">{attendee.name}</span>
        <span className="block text-xs text-slate-500">
          {[attendee.email, attendee.company].filter(Boolean).join(" · ") || "—"}
        </span>
      </span>

      {editable ? (
        <select
          value={attendee.status}
          onChange={(e) => startTransition(() => void setAttendeeStatus(attendee.id, e.target.value))}
          aria-label={`Status for ${attendee.name}`}
          className="rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs focus:border-gold-500 focus:outline-none"
        >
          {STATUSES.map((s) => (
            <option key={s} value={s}>
              {pretty(s)}
            </option>
          ))}
        </select>
      ) : (
        <Badge tone={attendee.status === "ATTENDED" ? "success" : "neutral"}>{pretty(attendee.status)}</Badge>
      )}
    </li>
  );
}
