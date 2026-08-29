import Image from "next/image";
import { redirect } from "next/navigation";
import { getPortalSession } from "@/lib/portal-auth";
import { PortalLoginForm } from "@/components/portal/PortalLoginForm";
import { getSettings } from "@/lib/queries";

export default async function PortalLoginPage() {
  if (await getPortalSession()) redirect("/portal");
  const settings = await getSettings();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <div className="relative hidden overflow-hidden bg-navy-950 lg:block">
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 50% at 78% 12%, rgba(181,135,38,0.34), transparent 60%), radial-gradient(48% 48% at 6% 92%, rgba(36,66,188,0.42), transparent 62%)",
          }}
        />
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold-700 via-gold-400 to-gold-700" />
        <div className="relative flex h-full flex-col justify-between p-12">
          <Image
            src="/brand/logo-light.png"
            alt={settings.siteName}
            width={1024}
            height={390}
            priority
            className="h-24 w-auto self-start"
          />
          <div>
            <h1 className="font-display text-4xl leading-tight text-white">
              Your projects,
              <br />
              in one place.
            </h1>
            <p className="mt-5 max-w-sm text-navy-200">
              Track progress, approve work, download invoices and raise requests — without chasing anyone over email.
            </p>
          </div>
          <p className="text-xs text-navy-400">
            © {new Date().getFullYear()} {settings.siteName}
          </p>
        </div>
      </div>

      <div className="flex items-center justify-center bg-white px-6 py-16">
        <div className="w-full max-w-sm">
          <Image
            src="/brand/logo.png"
            alt={settings.siteName}
            width={1024}
            height={390}
            priority
            className="mx-auto h-24 w-auto lg:hidden"
          />
          <h2 className="mt-8 text-2xl font-semibold text-navy-900 lg:mt-0">Client sign in</h2>
          <p className="mt-2 text-sm text-slate-500">Use the login your account manager set up for you.</p>
          <PortalLoginForm className="mt-8" />
        </div>
      </div>
    </div>
  );
}
