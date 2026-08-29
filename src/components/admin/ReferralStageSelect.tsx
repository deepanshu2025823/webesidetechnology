"use client";

import { useTransition } from "react";
import { setReferralStage } from "@/app/admin/actions/partners";

const STAGES = ["REFERRED", "OPPORTUNITY", "WON", "LOST"];
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase();

/** Moving a referral to WON is what triggers the reward calculation. */
export function ReferralStageSelect({ id, stage }: { id: string; stage: string }) {
  const [, startTransition] = useTransition();

  return (
    <select
      value={stage}
      onChange={(e) => startTransition(() => void setReferralStage(id, e.target.value))}
      aria-label="Referral stage"
      className="rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs focus:border-gold-500 focus:outline-none"
    >
      {STAGES.map((s) => (
        <option key={s} value={s}>
          {pretty(s)}
        </option>
      ))}
    </select>
  );
}
