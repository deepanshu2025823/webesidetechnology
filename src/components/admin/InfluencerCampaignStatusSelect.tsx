"use client";

import { useTransition } from "react";
import { setInfluencerCampaignStatus } from "@/app/admin/actions/partners";

const STATUSES = ["SHORTLISTED", "NEGOTIATING", "CONFIRMED", "CONTENT_LIVE", "COMPLETED", "DROPPED"];
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

export function InfluencerCampaignStatusSelect({ id, status }: { id: string; status: string }) {
  const [, startTransition] = useTransition();

  return (
    <select
      value={status}
      onChange={(e) => startTransition(() => void setInfluencerCampaignStatus(id, e.target.value))}
      aria-label="Collaboration status"
      className="rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs focus:border-gold-500 focus:outline-none"
    >
      {STATUSES.map((s) => (
        <option key={s} value={s}>
          {pretty(s)}
        </option>
      ))}
    </select>
  );
}
