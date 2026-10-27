import Link from "next/link";
import { AuthShell } from "@/components/admin/AuthShell";
import { BackToSignIn, ResetPasswordForm } from "@/components/admin/RecoveryForms";
import { verifyResetToken } from "@/lib/auth-recovery";

export default async function ResetPasswordPage({ searchParams }: { searchParams: Promise<{ token?: string }> }) {
  const { token = "" } = await searchParams;
  // Checked up front so a dead link says so before anyone types a password.
  const user = token ? await verifyResetToken(token) : null;

  if (!user) {
    return (
      <AuthShell title="This link no longer works" subtitle="Reset links last 30 minutes and can only be used once.">
        <Link
          href="/admin/forgot-password"
          className="mt-8 inline-flex w-full items-center justify-center rounded-xl bg-navy-900 px-6 py-3 text-sm font-semibold text-white hover:bg-navy-800"
        >
          Send me a new link
        </Link>
        <BackToSignIn />
      </AuthShell>
    );
  }

  return (
    <AuthShell title="Choose a new password" subtitle={`For ${user.email}.`}>
      <ResetPasswordForm token={token} className="mt-8" />
      <BackToSignIn />
    </AuthShell>
  );
}
