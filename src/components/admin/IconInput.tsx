"use client";

import { useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { inputClass } from "@/components/admin/ui";

const SUGGESTIONS = [
  "Sparkles", "Code2", "Smartphone", "LayoutDashboard", "Search", "Share2", "Megaphone",
  "TrendingUp", "PenLine", "Newspaper", "CalendarDays", "Plug", "MessageCircle", "Send",
  "PhoneCall", "ShoppingCart", "Globe", "ShieldCheck", "Rocket", "Compass", "Target",
  "Users", "BarChart3", "Award", "Handshake", "Headset", "Lightbulb", "Wrench",
];

/** Free-text Lucide icon name with a live preview and quick picks. */
export function IconInput({ name, defaultValue = "Sparkles" }: { name: string; defaultValue?: string }) {
  const [value, setValue] = useState(defaultValue || "Sparkles");

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <span className="grid size-10 shrink-0 place-items-center rounded-lg bg-navy-900 text-gold-400">
          <Icon name={value} className="size-5" />
        </span>
        <input
          name={name}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          className={inputClass}
          placeholder="Lucide icon name"
        />
      </div>
      <div className="flex flex-wrap gap-1">
        {SUGGESTIONS.map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setValue(s)}
            title={s}
            className="grid size-8 place-items-center rounded-lg border border-navy-900/10 text-slate-500 transition-colors hover:border-gold-400 hover:bg-gold-50 hover:text-gold-700"
          >
            <Icon name={s} className="size-4" />
          </button>
        ))}
      </div>
      <p className="text-xs text-slate-500">
        Any icon name from lucide.dev works — type it exactly as shown there.
      </p>
    </div>
  );
}
