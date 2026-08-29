"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { cn } from "@/lib/utils";

export type FaqItem = { id: string; question: string; answer: string };

export function FaqAccordion({ items }: { items: FaqItem[] }) {
  const [open, setOpen] = useState<string | null>(items[0]?.id ?? null);
  if (!items.length) return null;

  return (
    <div className="divide-y divide-navy-900/10 rounded-2xl border border-navy-900/10 bg-white">
      {items.map((item) => {
        const isOpen = open === item.id;
        return (
          <div key={item.id}>
            <h3>
              <button
                type="button"
                onClick={() => setOpen(isOpen ? null : item.id)}
                aria-expanded={isOpen}
                className="flex w-full items-start justify-between gap-6 px-6 py-5 text-left"
              >
                <span className={cn("text-base font-semibold", isOpen ? "text-gold-800" : "text-navy-900")}>
                  {item.question}
                </span>
                <Plus
                  className={cn(
                    "mt-0.5 size-5 shrink-0 text-gold-600 transition-transform duration-300",
                    isOpen && "rotate-45",
                  )}
                  aria-hidden
                />
              </button>
            </h3>
            <div
              className={cn(
                "grid transition-all duration-300 ease-out",
                isOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
              )}
            >
              <div className="overflow-hidden">
                <p className="px-6 pb-6 text-sm leading-relaxed text-slate-600">{item.answer}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
