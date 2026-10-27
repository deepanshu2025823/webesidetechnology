import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthShell } from "@/components/admin/AuthShell";
import { BackToSignIn, OtpLoginForm } from "@/components/admin/RecoveryForms";

export default async function OtpLoginPage() {
  if (await getSession()) redirect("/admin");

  return (
    <AuthShell title="Sign in with a one-time code" subtitle="We will email a 6-digit code to the address on your account.">
      <OtpLoginForm className="mt-8" />
      <BackToSignIn />
    </AuthShell>
  );
}
