import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { AuthShell } from "@/components/admin/AuthShell";
import { BackToSignIn, ForgotPasswordForm } from "@/components/admin/RecoveryForms";

export default async function ForgotPasswordPage() {
  if (await getSession()) redirect("/admin");

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="Enter the email you sign in with and we will send you a link to choose a new one."
    >
      <ForgotPasswordForm className="mt-8" />
      <BackToSignIn />
    </AuthShell>
  );
}
