"use client";

import { useFormStatus } from "react-dom";
import { Loader2, Save } from "lucide-react";
import { cn } from "@/lib/utils";

export function PageHeader({
  title,
  description,
  actions,
}: {
  title: string;
  description?: string;
  actions?: React.ReactNode;
}) {
  return (
    <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-navy-900">{title}</h1>
        {description ? <p className="mt-1.5 max-w-2xl text-sm text-slate-500">{description}</p> : null}
      </div>
      {actions ? <div className="flex shrink-0 flex-wrap gap-2">{actions}</div> : null}
    </header>
  );
}

export function Card({
  title,
  description,
  children,
  className,
}: {
  title?: string;
  description?: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("rounded-2xl border border-navy-900/10 bg-white shadow-sm", className)}>
      {title ? (
        <div className="border-b border-navy-900/10 px-6 py-4">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-navy-900">{title}</h2>
          {description ? <p className="mt-1 text-xs text-slate-500">{description}</p> : null}
        </div>
      ) : null}
      <div className="p-6">{children}</div>
    </section>
  );
}

export const inputClass =
  "w-full rounded-xl border border-navy-900/15 bg-white px-3.5 py-2.5 text-sm text-navy-900 placeholder:text-slate-400 transition-colors focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20 disabled:bg-slate-50";

export function FieldWrap({
  label,
  htmlFor,
  required,
  help,
  className,
  children,
}: {
  label: string;
  htmlFor?: string;
  required?: boolean;
  help?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={className}>
      <label htmlFor={htmlFor} className="text-sm font-medium text-navy-900">
        {label}
        {required ? <span className="text-gold-600"> *</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {help ? <p className="mt-1.5 text-xs text-slate-500">{help}</p> : null}
    </div>
  );
}

export function Toggle({
  name,
  label,
  defaultChecked,
  help,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
  help?: string;
}) {
  return (
    <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-navy-900/10 bg-slate-50 px-4 py-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        className="mt-0.5 size-4 rounded border-navy-900/25 text-gold-600 focus:ring-gold-500"
      />
      <span>
        <span className="block text-sm font-medium text-navy-900">{label}</span>
        {help ? <span className="mt-0.5 block text-xs text-slate-500">{help}</span> : null}
      </span>
    </label>
  );
}

export function SubmitButton({
  children = "Save changes",
  className,
  icon,
}: {
  children?: React.ReactNode;
  className?: string;
  /** Replaces the default save icon; pass null to render none. */
  icon?: React.ReactNode | null;
}) {
  const { pending } = useFormStatus();
  const leading = icon === undefined ? <Save className="size-4" aria-hidden /> : icon;

  return (
    <button
      type="submit"
      disabled={pending}
      className={cn(
        "inline-flex items-center justify-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60",
        className,
      )}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : leading}
      {pending ? "Saving…" : children}
    </button>
  );
}

export function Alert({ tone, children }: { tone: "error" | "success"; children: React.ReactNode }) {
  if (!children) return null;
  return (
    <p
      role={tone === "error" ? "alert" : "status"}
      className={cn(
        "rounded-xl px-4 py-3 text-sm",
        tone === "error" ? "bg-red-50 text-red-700" : "bg-emerald-50 text-emerald-700",
      )}
    >
      {children}
    </p>
  );
}

export function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-dashed border-navy-900/20 bg-white px-6 py-16 text-center">
      <p className="font-medium text-navy-900">{title}</p>
      {description ? <p className="mx-auto mt-1.5 max-w-sm text-sm text-slate-500">{description}</p> : null}
      {action ? <div className="mt-6 flex justify-center">{action}</div> : null}
    </div>
  );
}

export function Badge({ tone = "neutral", children }: { tone?: "neutral" | "success" | "warn" | "muted"; children: React.ReactNode }) {
  const tones = {
    neutral: "bg-navy-50 text-navy-700",
    success: "bg-emerald-50 text-emerald-700",
    warn: "bg-amber-50 text-amber-700",
    muted: "bg-slate-100 text-slate-500",
  };
  return (
    <span className={cn("inline-flex rounded-full px-2.5 py-0.5 text-xs font-medium", tones[tone])}>{children}</span>
  );
}
