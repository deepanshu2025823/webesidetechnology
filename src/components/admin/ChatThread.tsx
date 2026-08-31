"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { Loader2, Send, User } from "lucide-react";
import { cn } from "@/lib/utils";

export type ThreadMessage = { id: string; role: string; body: string; at: string; author?: string | null };

/**
 * The agent's view of one conversation.
 *
 * New visitor messages arrive by polling the same public endpoint the widget
 * uses — read-only and scoped by the session token, so the agent view needs no
 * separate streaming channel. Sending goes through a server action instead, so
 * it is authenticated and permission-checked.
 */
export function ChatThread({
  token,
  initial,
  onSend,
  closed,
}: {
  token: string;
  initial: ThreadMessage[];
  onSend: (form: FormData) => Promise<void>;
  closed: boolean;
}) {
  const [messages, setMessages] = useState(initial);
  const bottom = useRef<HTMLDivElement>(null);

  // Server-rendered history wins after a revalidate, so a reply just sent does
  // not appear twice once the action's own refresh lands.
  const [lastInitial, setLastInitial] = useState(initial);
  if (initial !== lastInitial) {
    setLastInitial(initial);
    setMessages(initial);
  }

  useEffect(() => {
    if (closed) return;

    const tick = async () => {
      const after = messages.at(-1)?.at ?? "";
      try {
        const response = await fetch(`/api/chat?token=${encodeURIComponent(token)}&after=${encodeURIComponent(after)}`);
        if (!response.ok) return;
        const data = (await response.json()) as { messages: ThreadMessage[] };
        if (data.messages.length) setMessages((prev) => [...prev, ...data.messages]);
      } catch {
        // Transient network errors resolve themselves on the next tick.
      }
    };

    const id = setInterval(tick, 5000);
    return () => clearInterval(id);
  }, [token, messages, closed]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end", behavior: "smooth" });
  }, [messages]);

  return (
    <div className="flex h-[62vh] flex-col overflow-hidden rounded-2xl border border-navy-900/10 bg-white">
      <div className="scroll-slim flex-1 space-y-3 overflow-y-auto bg-slate-50/60 p-5">
        {messages.map((message) => (
          <Bubble key={message.id} message={message} />
        ))}
        <div ref={bottom} />
      </div>

      {closed ? (
        <p className="border-t border-navy-900/10 px-5 py-4 text-center text-sm text-slate-500">
          This conversation is closed.
        </p>
      ) : (
        <form action={onSend} className="flex items-center gap-2 border-t border-navy-900/10 px-4 py-3">
          <input
            name="body"
            required
            maxLength={2000}
            placeholder="Reply to the visitor…"
            aria-label="Reply"
            autoComplete="off"
            className="min-w-0 flex-1 rounded-full border border-navy-900/15 px-4 py-2.5 text-sm focus:border-gold-500 focus:outline-none"
          />
          <SendButton />
        </form>
      )}
    </div>
  );
}

function SendButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="grid size-10 shrink-0 place-items-center rounded-full bg-navy-900 text-white transition-colors hover:bg-navy-800 disabled:opacity-50"
      aria-label="Send reply"
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
    </button>
  );
}

function Bubble({ message }: { message: ThreadMessage }) {
  // The agent's own side of the thread sits right, the visitor's left — the
  // same orientation the visitor sees, mirrored.
  const outbound = message.role !== "VISITOR";

  return (
    <div className={cn("flex gap-2", outbound && "flex-row-reverse")}>
      <span
        className={cn(
          "grid size-7 shrink-0 place-items-center self-end rounded-full text-[11px] font-bold",
          message.role === "VISITOR"
            ? "bg-slate-200 text-slate-600"
            : message.role === "AGENT"
              ? "bg-gold-600 text-navy-950"
              : "bg-navy-900 font-display text-gold-300",
        )}
        aria-hidden
      >
        {message.role === "VISITOR" ? <User className="size-3.5" /> : message.role === "AGENT" ? "A" : "S"}
      </span>

      <div
        className={cn(
          "max-w-[75%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          message.role === "VISITOR"
            ? "rounded-bl-sm border border-navy-900/10 bg-white text-navy-900"
            : message.role === "AGENT"
              ? "rounded-br-sm bg-navy-900 text-white"
              : "rounded-br-sm bg-slate-200 text-slate-700",
        )}
      >
        <span
          className={cn(
            "mb-0.5 block text-[10px] font-semibold uppercase tracking-wider",
            message.role === "VISITOR" ? "text-slate-400" : message.role === "AGENT" ? "text-gold-300" : "text-slate-500",
          )}
        >
          {message.role === "VISITOR" ? "Visitor" : message.role === "AGENT" ? (message.author ?? "Team") : "Sahab"}
        </span>
        {message.body}
      </div>
    </div>
  );
}
