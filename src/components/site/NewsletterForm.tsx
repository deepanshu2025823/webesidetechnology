"use client";

import { useState } from "react";
import { ArrowRight, Check, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export function NewsletterForm({ className }: { className?: string }) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setState("loading");
    try {
      const res = await fetch("/api/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      setState("done");
      setMessage(data.message ?? "You're subscribed.");
      setEmail("");
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Something went wrong");
    }
  }

  if (state === "done") {
    return (
      <p className={cn("flex items-center gap-2 text-sm text-gold-300", className)}>
        <Check className="size-4" aria-hidden /> {message}
      </p>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-2", className)}>
      <div className="flex overflow-hidden rounded-full border border-white/15 bg-white/5 focus-within:border-gold-400">
        <label htmlFor="newsletter-email" className="sr-only">
          Email address
        </label>
        <input
          id="newsletter-email"
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@company.com"
          className="min-w-0 flex-1 bg-transparent px-5 py-3 text-sm text-white placeholder:text-navy-400 focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === "loading"}
          aria-label="Subscribe"
          className="grid w-12 shrink-0 place-items-center bg-gold-600 text-navy-950 transition-colors hover:bg-gold-500 disabled:opacity-60"
        >
          {state === "loading" ? (
            <Loader2 className="size-4 animate-spin" aria-hidden />
          ) : (
            <ArrowRight className="size-4" aria-hidden />
          )}
        </button>
      </div>
      {state === "error" ? <p className="text-xs text-red-300">{message}</p> : null}
    </form>
  );
}
