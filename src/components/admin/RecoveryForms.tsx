"use client";

import { useActionState, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Eye, EyeOff, KeyRound, Loader2, Mail } from "lucide-react";
import { otpAction, requestPasswordReset, resetPassword, type RecoveryState } from "@/app/admin/actions/recovery";
import { cn } from "@/lib/utils";

/**
 * The signed-out admin flows other than password sign-in: forgot password,
 * set a new password, and sign in with an emailed one-time code. Styled to
 * match LoginForm field for field.
 */

const inputClass =
  "mt-1.5 w-full rounded-xl border border-navy-900/15 px-4 py-3 text-sm focus:border-gold-500 focus:outline-none focus:ring-2 focus:ring-gold-500/20";
const submitClass =
  "inline-flex w-full items-center justify-center gap-2 rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-navy-800 disabled:opacity-60";

function Notice({ state }: { state: RecoveryState }) {
  if (state.error) {
    return (
      <p role="alert" className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">
        {state.error}
      </p>
    );
  }
  if (state.message) {
    return (
      <p role="status" className="rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
        {state.message}
      </p>
    );
  }
  return null;
}

export function BackToSignIn() {
  return (
    <Link
      href="/admin/login"
      className="mt-6 inline-flex items-center gap-1.5 text-sm font-medium text-navy-700 hover:text-navy-900"
    >
      <ArrowLeft className="size-4" aria-hidden /> Back to sign in
    </Link>
  );
}

function EmailField({ defaultValue }: { defaultValue?: string }) {
  return (
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
        defaultValue={defaultValue}
        className={inputClass}
      />
    </div>
  );
}

export function ForgotPasswordForm({ className }: { className?: string }) {
  const [state, action, pending] = useActionState<RecoveryState, FormData>(requestPasswordReset, {});

  return (
    <form action={action} className={cn("space-y-5", className)}>
      <EmailField />
      <Notice state={state} />
      <button type="submit" disabled={pending} className={submitClass}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
        {pending ? "Sending…" : "Email me a reset link"}
      </button>
    </form>
  );
}

function PasswordField({ id, label, autoFocus }: { id: string; label: string; autoFocus?: boolean }) {
  const [visible, setVisible] = useState(false);
  return (
    <div>
      <label htmlFor={id} className="text-sm font-medium text-navy-900">
        {label}
      </label>
      <div className="relative mt-1.5">
        <input
          id={id}
          name={id}
          type={visible ? "text" : "password"}
          required
          minLength={8}
          autoComplete="new-password"
          autoFocus={autoFocus}
          className={cn(inputClass, "mt-0 pr-11")}
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
  );
}

export function ResetPasswordForm({ token, className }: { token: string; className?: string }) {
  const [state, action, pending] = useActionState<RecoveryState, FormData>(resetPassword, {});

  return (
    <form action={action} className={cn("space-y-5", className)}>
      <input type="hidden" name="token" value={token} />
      <PasswordField id="password" label="New password" autoFocus />
      <PasswordField id="confirm" label="Confirm new password" />
      <p className="text-xs text-slate-500">At least 8 characters.</p>
      <Notice state={state} />
      <button type="submit" disabled={pending} className={submitClass}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        {pending ? "Saving…" : "Set new password"}
      </button>
    </form>
  );
}

/**
 * Two steps on one screen, driven by the step the server action returns: a
 * wrong code keeps the code box up, a burned code sends you back to email.
 */
export function OtpLoginForm({ className }: { className?: string }) {
  const [state, action, pending] = useActionState<RecoveryState, FormData>(otpAction, { step: "email" });

  if (state.step !== "code") {
    return (
      <form action={action} className={cn("space-y-5", className)}>
        <input type="hidden" name="intent" value="send" />
        <EmailField defaultValue={state.email} />
        <Notice state={state} />
        <button type="submit" disabled={pending} className={submitClass}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Mail className="size-4" />}
          {pending ? "Sending…" : "Email me a code"}
        </button>
      </form>
    );
  }

  return (
    <form action={action} className={cn("space-y-5", className)}>
      <input type="hidden" name="email" value={state.email ?? ""} />
      <div>
        <label htmlFor="code" className="text-sm font-medium text-navy-900">
          6-digit code
        </label>
        <input
          id="code"
          name="code"
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]{6}"
          maxLength={6}
          required
          autoFocus
          placeholder="••••••"
          className={cn(inputClass, "text-center text-lg tracking-[0.5em]")}
        />
        {state.email ? <p className="mt-2 text-xs text-slate-500">Sent to {state.email}</p> : null}
      </div>
      <Notice state={state} />
      <button type="submit" name="intent" value="verify" disabled={pending} className={submitClass}>
        {pending ? <Loader2 className="size-4 animate-spin" /> : <KeyRound className="size-4" />}
        {pending ? "Please wait…" : "Verify and sign in"}
      </button>
      <div className="flex items-center justify-between text-sm">
        <button
          type="submit"
          name="intent"
          value="restart"
          formNoValidate
          disabled={pending}
          className="font-medium text-navy-700 hover:text-navy-900"
        >
          Use a different email
        </button>
        <button
          type="submit"
          name="intent"
          value="send"
          formNoValidate
          disabled={pending}
          className="font-medium text-gold-700 hover:text-gold-800 disabled:opacity-60"
        >
          Resend code
        </button>
      </div>
    </form>
  );
}
