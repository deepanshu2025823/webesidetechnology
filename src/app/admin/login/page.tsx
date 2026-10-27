import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { AuthShell } from "@/components/admin/AuthShell";

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ reset?: string }> }) {
  if (await getSession()) redirect("/admin");
  const { reset } = await searchParams;

  return (
    <AuthShell title="Sign in to the admin panel" subtitle="Use the credentials issued by your administrator.">
      {reset === "done" ? (
        <p role="status" className="mt-6 rounded-lg bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          Your password has been changed. Sign in with the new one.
        </p>
      ) : null}
      <LoginForm className="mt-8" />
    </AuthShell>
  );
}
