"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Loader2, MessageCircle, Send, User, X } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = { id: string; role: string; body: string; at: string };
type Suggestion = { label: string; intent: string };

const STORAGE_KEY = "sahab-chat-token";
const POLL_MS = 5000;

/** The intent chips map to the phrases the server-side matcher understands. */
const INTENT_TEXT: Record<string, string> = {
  services: "What services do you offer?",
  pricing: "What does it cost?",
  portfolio: "Can I see your work?",
  contact: "How do I contact you?",
  timeline: "How long does it take?",
  calculator: "Tell me about the calculator",
  menu: "What else can you help with?",
  human: "I'd like to talk to a human",
};

/**
 * "Sahab" — the site's chat assistant, with a handover to a real person.
 *
 * The assistant answers from the site's own catalogue and settings. When the
 * visitor asks for a human the thread is queued in the admin panel and this
 * widget switches to polling, so the same window carries the whole conversation
 * rather than bouncing the visitor to another channel.
 */
export function ChatWidget({ siteName }: { siteName: string }) {
  const [open, setOpen] = useState(false);
  const [started, setStarted] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [status, setStatus] = useState("BOT");
  const [draft, setDraft] = useState("");
  const [sending, setSending] = useState(false);
  const [askDetails, setAskDetails] = useState(false);
  const [error, setError] = useState("");
  const [unread, setUnread] = useState(0);

  const token = useRef<string | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  const panel = useRef<HTMLDivElement>(null);

  const apply = useCallback((data: { token?: string; status?: string; messages?: Message[]; suggestions?: Suggestion[] }) => {
    if (data.token) {
      token.current = data.token;
      try {
        localStorage.setItem(STORAGE_KEY, data.token);
      } catch {
        // Private mode: the conversation still works, it just won't resume.
      }
    }
    if (data.status) setStatus(data.status);
    if (data.messages) setMessages(data.messages);
    setSuggestions(data.suggestions ?? []);
  }, []);

  /** Opens or resumes the conversation the first time the panel is shown. */
  const start = useCallback(async () => {
    if (started) return;
    setStarted(true);
    setError("");

    let saved: string | null = null;
    try {
      saved = localStorage.getItem(STORAGE_KEY);
    } catch {
      saved = null;
    }

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "start", token: saved ?? undefined, pageUrl: window.location.pathname }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not start the chat");
      apply(data);
    } catch (err) {
      setStarted(false);
      setError(err instanceof Error ? err.message : "Could not start the chat.");
    }
  }, [apply, started]);

  // Poll only once a person is involved — while the bot is answering, every
  // reply already comes back on the request that triggered it.
  useEffect(() => {
    if (!token.current || status === "BOT" || status === "CLOSED") return;

    const tick = async () => {
      const after = messages.at(-1)?.at ?? "";
      try {
        const response = await fetch(`/api/chat?token=${encodeURIComponent(token.current!)}&after=${encodeURIComponent(after)}`);
        if (!response.ok) return;
        const data = (await response.json()) as { status: string; messages: Message[] };
        setStatus(data.status);
        if (data.messages.length) {
          setMessages((prev) => [...prev, ...data.messages]);
          if (!open) setUnread((n) => n + data.messages.length);
        }
      } catch {
        // A dropped poll is not worth surfacing; the next one will catch up.
      }
    };

    const id = setInterval(tick, POLL_MS);
    return () => clearInterval(id);
  }, [status, messages, open]);

  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "end" });
  }, [messages, askDetails]);

  // Escape closes the panel, as it does for the mobile nav and admin dialogs.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [open]);

  async function send(body: string) {
    const text = body.trim();
    if (!text || !token.current || sending) return;

    setSending(true);
    setError("");
    setDraft("");
    // Shown immediately; the server echo replaces it on the next render.
    setMessages((prev) => [...prev, { id: `local-${Date.now()}`, role: "VISITOR", body: text, at: new Date().toISOString() }]);
    setSuggestions([]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "message", token: token.current, body: text }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Message not sent");
      apply(data);
      if (data.askForDetails) setAskDetails(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Message not sent.");
    } finally {
      setSending(false);
    }
  }

  async function requestHuman(form: FormData) {
    if (!token.current) return;
    setSending(true);
    setError("");

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "handoff",
          token: token.current,
          name: String(form.get("name") ?? ""),
          email: String(form.get("email") ?? ""),
          phone: String(form.get("phone") ?? ""),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error ?? "Could not reach the team");
      apply(data);
      setAskDetails(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not reach the team.");
    } finally {
      setSending(false);
    }
  }

  const waiting = status === "WAITING_AGENT";
  const live = status === "WITH_AGENT";

  return (
    <>
      <button
        type="button"
        onClick={() => {
          const next = !open;
          setOpen(next);
          if (next) {
            setUnread(0);
            void start();
          }
        }}
        aria-label={open ? "Close chat" : `Chat with ${siteName}`}
        aria-expanded={open}
        className="fixed bottom-20 right-4 z-50 grid size-14 place-items-center rounded-full bg-navy-900 text-gold-300 shadow-brand transition-transform hover:scale-105 lg:bottom-6 lg:right-6"
      >
        {open ? <X className="size-6" aria-hidden /> : <MessageCircle className="size-6" aria-hidden />}
        {unread && !open ? (
          <span className="absolute -right-0.5 -top-0.5 grid size-5 place-items-center rounded-full bg-gold-500 text-[11px] font-bold text-navy-950">
            {unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          ref={panel}
          role="dialog"
          aria-label={`Chat with ${siteName}`}
          className="fixed inset-x-3 bottom-36 z-50 flex max-h-[70vh] flex-col overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-brand sm:inset-x-auto sm:right-4 sm:w-96 lg:bottom-24 lg:right-6"
        >
          <header className="flex items-center gap-3 bg-navy-900 px-4 py-3.5 text-white">
            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold-600 font-display text-lg font-bold text-navy-950">
              S
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-semibold">Sahab</span>
              <span className="block truncate text-xs text-navy-200">
                {live ? "You're talking to the team" : waiting ? "Connecting you to the team…" : `Assistant at ${siteName}`}
              </span>
            </span>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-1.5 text-navy-200 transition-colors hover:bg-white/10 hover:text-white"
              aria-label="Close chat"
            >
              <X className="size-4" />
            </button>
          </header>

          <div className="scroll-slim flex-1 space-y-3 overflow-y-auto bg-cream px-4 py-4">
            {!started ? (
              <p className="flex items-center justify-center gap-2 py-8 text-sm text-slate-500">
                <Loader2 className="size-4 animate-spin" aria-hidden /> Starting…
              </p>
            ) : null}

            {messages.map((message) => (
              <Bubble key={message.id} role={message.role} body={message.body} />
            ))}

            {waiting ? (
              <p className="rounded-xl bg-gold-50 px-3.5 py-2.5 text-center text-xs text-gold-800">
                Waiting for a team member to join…
              </p>
            ) : null}

            {askDetails ? (
              <form
                action={requestHuman}
                className="space-y-2.5 rounded-xl border border-navy-900/10 bg-white p-3.5"
                aria-label="Your contact details"
              >
                <p className="text-xs font-medium text-navy-900">So the team can reach you</p>
                <input name="name" placeholder="Your name" className={fieldClass} autoComplete="name" />
                <input name="email" type="email" placeholder="Email" className={fieldClass} autoComplete="email" />
                <input name="phone" placeholder="Phone" className={fieldClass} autoComplete="tel" inputMode="tel" />
                <button
                  type="submit"
                  disabled={sending}
                  className="w-full rounded-lg bg-navy-900 px-4 py-2 text-xs font-semibold text-white hover:bg-navy-800 disabled:opacity-60"
                >
                  {sending ? "Connecting…" : "Connect me"}
                </button>
              </form>
            ) : null}

            {suggestions.length ? (
              <div className="flex flex-wrap gap-1.5 pt-1">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion.intent}
                    type="button"
                    onClick={() => send(INTENT_TEXT[suggestion.intent] ?? suggestion.label)}
                    className="rounded-full border border-navy-900/15 bg-white px-3 py-1.5 text-xs font-medium text-navy-800 transition-colors hover:border-gold-500 hover:bg-gold-50"
                  >
                    {suggestion.label}
                  </button>
                ))}
              </div>
            ) : null}

            {error ? <p className="text-center text-xs text-red-600">{error}</p> : null}
            <div ref={bottom} />
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void send(draft);
            }}
            className="flex items-center gap-2 border-t border-navy-900/10 bg-white px-3 py-2.5"
          >
            <input
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="Type your message…"
              aria-label="Message"
              disabled={!started || status === "CLOSED"}
              className="min-w-0 flex-1 rounded-full border border-navy-900/15 px-4 py-2 text-sm focus:border-gold-500 focus:outline-none disabled:bg-slate-50"
            />
            <button
              type="submit"
              disabled={!draft.trim() || sending}
              className="grid size-9 shrink-0 place-items-center rounded-full bg-navy-900 text-white transition-colors hover:bg-navy-800 disabled:opacity-40"
              aria-label="Send"
            >
              {sending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Send className="size-4" aria-hidden />}
            </button>
          </form>
        </div>
      ) : null}
    </>
  );
}

const fieldClass =
  "w-full rounded-lg border border-navy-900/15 px-3 py-2 text-xs focus:border-gold-500 focus:outline-none";

function Bubble({ role, body }: { role: string; body: string }) {
  const mine = role === "VISITOR";

  return (
    <div className={cn("flex gap-2", mine && "flex-row-reverse")}>
      {!mine ? (
        <span
          className={cn(
            "grid size-7 shrink-0 place-items-center self-end rounded-full text-[11px] font-bold",
            role === "AGENT" ? "bg-gold-600 text-navy-950" : "bg-navy-900 font-display text-gold-300",
          )}
          aria-hidden
        >
          {role === "AGENT" ? <User className="size-3.5" /> : "S"}
        </span>
      ) : null}

      <div
        className={cn(
          "max-w-[80%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
          mine ? "rounded-br-sm bg-navy-900 text-white" : "rounded-bl-sm border border-navy-900/10 bg-white text-navy-900",
        )}
      >
        {role === "AGENT" ? (
          <span className="mb-0.5 block text-[10px] font-semibold uppercase tracking-wider text-gold-700">Team</span>
        ) : null}
        {body}
      </div>
    </div>
  );
}
