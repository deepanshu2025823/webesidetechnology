"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, Send } from "lucide-react";
import { cn } from "@/lib/utils";
import { buttonClass } from "@/components/ui/Button";

const BUDGETS = ["Under ₹50,000", "₹50,000 – ₹2 lakh", "₹2 – ₹5 lakh", "₹5 lakh+", "Not sure yet"];

export function ContactForm({
  services,
  defaultService,
  source = "contact-page",
  compact = false,
  className,
}: {
  services: string[];
  defaultService?: string;
  source?: string;
  compact?: boolean;
  className?: string;
}) {
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    setState("loading");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, source, pageUrl: window.location.pathname }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not send your message");
      setState("done");
      setMessage(data.message ?? "Thanks — we'll be in touch shortly.");
      form.reset();
    } catch (err) {
      setState("error");
      setMessage(err instanceof Error ? err.message : "Could not send your message");
    }
  }

  if (state === "done") {
    return (
      <div className={cn("rounded-2xl border border-gold-400/40 bg-gold-50 p-6 text-center", className)}>
        <CheckCircle2 className="mx-auto size-9 text-gold-600" aria-hidden />
        <p className="mt-3 font-semibold text-navy-900">Enquiry received</p>
        <p className="mt-1 text-sm text-slate-600">{message}</p>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className={cn("space-y-4", className)} noValidate={false}>
      {/* Honeypot - real people never fill this in. */}
      <div className="absolute left-[-9999px]" aria-hidden>
        <label htmlFor={`company_website-${source}`}>Leave this empty</label>
        <input id={`company_website-${source}`} name="company_website" tabIndex={-1} autoComplete="off" />
      </div>

      <div className={cn("grid gap-4", !compact && "sm:grid-cols-2")}>
        <Field label="Your name" name="name" required placeholder="Priya Sharma" />
        <Field label="Email" name="email" type="email" required placeholder="priya@company.com" />
      </div>

      <div className={cn("grid gap-4", !compact && "sm:grid-cols-2")}>
        <Field label="Phone" name="phone" type="tel" placeholder="+91 98xxxxxxxx" />
        <Field label="Company" name="company" placeholder="Company name" />
      </div>

      <div className={cn("grid gap-4", !compact && "sm:grid-cols-2")}>
        <div>
          <Label htmlFor={`serviceInterest-${source}`}>Service needed</Label>
          <select
            id={`serviceInterest-${source}`}
            name="serviceInterest"
            defaultValue={defaultService ?? ""}
            className={inputClass}
          >
            <option value="">Select a service</option>
            {services.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
            <option value="Other">Other / not listed</option>
          </select>
        </div>
        <div>
          <Label htmlFor={`budget-${source}`}>Budget range</Label>
          <select id={`budget-${source}`} name="budget" defaultValue="" className={inputClass}>
            <option value="">Select a range</option>
            {BUDGETS.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <Label htmlFor={`message-${source}`}>Tell us about the project</Label>
        <textarea
          id={`message-${source}`}
          name="message"
          rows={compact ? 3 : 5}
          required
          placeholder="What are you trying to achieve, and by when?"
          className={inputClass}
        />
      </div>

      {state === "error" ? (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {message}
        </p>
      ) : null}

      <button type="submit" disabled={state === "loading"} className={buttonClass("primary", "md", "w-full")}>
        {state === "loading" ? (
          <>
            <Loader2 className="size-4 animate-spin" aria-hidden /> Sending…
          </>
        ) : (
          <>
            <Send className="size-4" aria-hidden /> Send enquiry
          </>
        )}
      </button>

      <p className="text-center text-xs text-slate-500">
        We reply within one working day. Your details are never shared.
      </p>
    </form>
  );
}

const inputClass =
  "mt-1.5 w-full rounded-xl border border-navy-900/15 bg-white px-4 py-3 text-sm text-navy-900 placeholder:text-slate-400 transition-colors focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20";

function Label({ htmlFor, children }: { htmlFor: string; children: React.ReactNode }) {
  return (
    <label htmlFor={htmlFor} className="text-sm font-medium text-navy-900">
      {children}
    </label>
  );
}

function Field({
  label,
  name,
  type = "text",
  required,
  placeholder,
}: {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <Label htmlFor={name}>
        {label}
        {required ? <span className="text-gold-600"> *</span> : null}
      </Label>
      <input
        id={name}
        name={name}
        type={type}
        required={required}
        placeholder={placeholder}
        autoComplete={name === "name" ? "name" : name === "email" ? "email" : name === "phone" ? "tel" : "off"}
        className={inputClass}
      />
    </div>
  );
}
