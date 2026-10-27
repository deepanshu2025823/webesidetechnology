"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { Eye, EyeOff, Loader2, LogIn, Mail } from "lucide-react";
import { loginAction, type LoginState } from "@/app/admin/actions/auth";
import { cn } from "@/lib/utils";

export function LoginForm({ className }: { className?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(loginAction, {});
  const [visible, setVisible] = useState(false);

  return (
    <form action={action} className={cn("space-y-5", className)}>
      <div>
        <label htmlFor="email" className="text-sm font-medium text-navy-900">
          Email
        </label>
        <input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          autoFocus
          className="mt-1.5 w-full rounded-xl border border-navy-900/15 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
        />
      </div>

      <div>
        <div className="flex items-center justify-between">
          <label htmlFor="password" className="text-sm font-medium text-navy-900">
            Password
          </label>
          <Link href="/admin/forgot-password" className="text-sm font-medium text-gold-700 hover:text-gold-800">
            Forgot password?
          </Link>
        </div>
        <div className="relative mt-1.5">
          <input
            id="password"
            name="password"
            type={visible ? "text" : "password"}
            required
            autoComplete="current-password"
            className="w-full rounded-xl border border-navy-900/15 px-4 py-3 pr-11 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20"
          />
          <button
            type="button"
            onClick={() => setVisible((v) => !v)}
            aria-label={visible ? "Hide password" : "Show password"}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-navy-800"
          >
            {visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
          </button>
        </div>
      </div>

      {state.error ? (
        <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
          {state.error}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={pending}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60"
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <LogIn className="size-4" />}
        {pending ? "Signing in…" : "Sign in"}
      </button>

      <div className="flex items-center gap-3 text-xs uppercase tracking-wider text-slate-400">
        <span className="h-px flex-1 bg-navy-900/10" />
        or
        <span className="h-px flex-1 bg-navy-900/10" />
      </div>

      <Link
        href="/admin/login/otp"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-navy-900/15 px-6 py-3 text-sm font-semibold text-navy-900 transition-colors hover:border-navy-900/30 hover:bg-navy-50"
      >
        <Mail className="size-4" aria-hidden />
        Sign in with OTP on email
      </Link>
    </form>
  );
}
