"use client";

import { useState, useTransition } from "react";
import { MessageSquare, Plus, Trash2 } from "lucide-react";
import { addContentComment, deleteContentItem, saveContentItem, setContentStage } from "@/app/admin/actions/campaigns";
import { Badge, inputClass } from "@/components/admin/ui";
import { cn, formatDate } from "@/lib/utils";

export type ContentCard = {
  id: string;
  title: string;
  type: string;
  platform: string;
  stage: string;
  scheduledAt: string | null;
  owner: string | null;
  revisionCount: number;
  comments: { id: string; body: string; author: string; createdAt: string }[];
};

const STAGES = [
  { key: "IDEA", label: "Idea" },
  { key: "COPY", label: "Copy" },
  { key: "DESIGN", label: "Design / video" },
  { key: "INTERNAL_REVIEW", label: "Internal review" },
  { key: "CLIENT_APPROVAL", label: "Client approval" },
  { key: "REVISION", label: "Revision" },
  { key: "SCHEDULED", label: "Scheduled" },
  { key: "PUBLISHED", label: "Published" },
];

const TYPES = ["POST", "REEL", "STORY", "STATIC", "VIDEO", "CAROUSEL"];
const PLATFORMS = ["INSTAGRAM", "FACEBOOK", "LINKEDIN", "YOUTUBE", "X", "OTHER"];
const pretty = (v: string) => v.charAt(0) + v.slice(1).toLowerCase().replace(/_/g, " ");

/** The content workflow from scope section 9, as a stage board. */
export function ContentBoard({
  planId,
  items,
  owners,
  editable,
}: {
  planId: string;
  items: ContentCard[];
  owners: { id: string; name: string }[];
  editable: boolean;
}) {
  const [, startTransition] = useTransition();
  const [openComments, setOpenComments] = useState<string | null>(null);
  const add = saveContentItem.bind(null, planId);

  return (
    <>
      {editable ? (
        <form action={add} className="mb-6 grid gap-3 rounded-xl border border-navy-900/10 bg-slate-50 p-4 sm:grid-cols-12">
          <input name="title" required placeholder="Content idea" className={`${inputClass} sm:col-span-4`} />
          <select name="type" defaultValue="POST" className={`${inputClass} sm:col-span-2`} aria-label="Type">
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {pretty(t)}
              </option>
            ))}
          </select>
          <select name="platform" defaultValue="INSTAGRAM" className={`${inputClass} sm:col-span-2`} aria-label="Platform">
            {PLATFORMS.map((p) => (
              <option key={p} value={p}>
                {pretty(p)}
              </option>
            ))}
          </select>
          <input name="scheduledAt" type="date" className={`${inputClass} sm:col-span-2`} aria-label="Scheduled date" />
          <select name="ownerId" defaultValue="" className={`${inputClass} sm:col-span-2`} aria-label="Owner">
            <option value="">Owner</option>
            {owners.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800 sm:col-span-12"
          >
            <Plus className="size-4" aria-hidden /> Add content
          </button>
        </form>
      ) : null}

      <div className="scroll-slim -mx-1 flex gap-4 overflow-x-auto px-1 pb-2">
        {STAGES.map((stage) => {
          const cards = items.filter((i) => i.stage === stage.key);
          return (
            <section key={stage.key} className="w-64 shrink-0">
              <header className="mb-3 flex items-center justify-between px-1">
                <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">{stage.label}</h3>
                <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">{cards.length}</span>
              </header>

              <ul className="space-y-2">
                {cards.map((card) => (
                  <li key={card.id} className="rounded-xl border border-navy-900/10 bg-white p-3 shadow-sm">
                    <p className="text-sm font-medium leading-snug text-navy-900">{card.title}</p>

                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-xs text-slate-500">
                      <Badge tone="neutral">{pretty(card.platform)}</Badge>
                      <span>{pretty(card.type)}</span>
                      {card.revisionCount ? <Badge tone="warn">{card.revisionCount} rev</Badge> : null}
                    </div>

                    {card.scheduledAt ? (
                      <p className="mt-1.5 text-xs text-slate-400">{formatDate(card.scheduledAt)}</p>
                    ) : null}
                    {card.owner ? <p className="text-xs text-slate-400">{card.owner}</p> : null}

                    {editable ? (
                      <div className="mt-3 flex items-center gap-1.5">
                        <select
                          value={card.stage}
                          onChange={(e) => startTransition(() => void setContentStage(card.id, e.target.value))}
                          aria-label={`Move ${card.title}`}
                          className="min-w-0 flex-1 rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs focus:border-gold-500 focus:outline-none"
                        >
                          {STAGES.map((s) => (
                            <option key={s.key} value={s.key}>
                              {s.label}
                            </option>
                          ))}
                        </select>
                        <button
                          type="button"
                          onClick={() => setOpenComments(openComments === card.id ? null : card.id)}
                          className={cn(
                            "relative rounded-lg p-1.5 text-slate-400 hover:bg-navy-50 hover:text-navy-900",
                            card.comments.length > 0 && "text-navy-700",
                          )}
                          aria-label="Comments"
                        >
                          <MessageSquare className="size-3.5" />
                          {card.comments.length ? (
                            <span className="absolute -right-0.5 -top-0.5 grid size-3.5 place-items-center rounded-full bg-gold-500 text-[9px] font-semibold text-navy-950">
                              {card.comments.length}
                            </span>
                          ) : null}
                        </button>
                        <button
                          type="button"
                          onClick={() => startTransition(() => void deleteContentItem(card.id))}
                          className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${card.title}`}
                        >
                          <Trash2 className="size-3.5" />
                        </button>
                      </div>
                    ) : null}

                    {openComments === card.id ? (
                      <div className="mt-3 border-t border-navy-900/5 pt-3">
                        {card.comments.length ? (
                          <ul className="mb-2 space-y-2">
                            {card.comments.map((c) => (
                              <li key={c.id} className="rounded-lg bg-slate-50 p-2 text-xs">
                                <p className="text-slate-700">{c.body}</p>
                                <p className="mt-1 text-[10px] text-slate-400">
                                  {c.author} · {formatDate(c.createdAt, { day: "numeric", month: "short" })}
                                </p>
                              </li>
                            ))}
                          </ul>
                        ) : null}
                        <form action={addContentComment.bind(null, card.id)} className="flex gap-1.5">
                          <input
                            name="body"
                            required
                            placeholder="Add a note…"
                            className="min-w-0 flex-1 rounded-lg border border-navy-900/15 px-2 py-1.5 text-xs"
                          />
                          <button type="submit" className="rounded-lg bg-navy-900 px-2.5 text-xs font-medium text-white">
                            Post
                          </button>
                        </form>
                      </div>
                    ) : null}
                  </li>
                ))}

                {cards.length === 0 ? (
                  <li className="rounded-xl border border-dashed border-navy-900/15 px-3 py-6 text-center text-xs text-slate-400">
                    Nothing here
                  </li>
                ) : null}
              </ul>
            </section>
          );
        })}
      </div>
    </>
  );
}
