import Image from "next/image";
import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { LoginForm } from "@/components/admin/LoginForm";
import { getSettings } from "@/lib/queries";

export default async function LoginPage() {
  if (await getSession()) redirect("/admin");
  const settings = await getSettings();

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden bg-navy-950 lg:block">
        {/* Same ambient treatment as the public hero, so the panel reads as one brand. */}
        <div
          aria-hidden
          className="absolute inset-0"
          style={{
            background:
              "radial-gradient(55% 50% at 78% 12%, rgba(181,135,38,0.34), transparent 60%), radial-gradient(48% 48% at 6% 92%, rgba(36,66,188,0.42), transparent 62%)",
          }}
        />
        <div
          aria-hidden
          className="absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(to right, #fff 1px, transparent 1px), linear-gradient(to bottom, #fff 1px, transparent 1px)",
            backgroundSize: "64px 64px",
          }}
        />
        <div aria-hidden className="absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-gold-700 via-gold-400 to-gold-700" />
        <div className="relative flex h-full flex-col justify-between p-12">
          {/*
            self-start matters: this sits in a flex column, where the default
            align-items:stretch would pull the image to the panel's full width
            and squash the lockup flat.
          */}
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
              Your website,
              <br />
              under your control.
            </h1>
            <p className="mt-5 max-w-sm text-navy-200">
              Publish services, case studies and articles, capture enquiries and tune your SEO — without touching code.
            </p>
          </div>
          <p className="text-xs text-navy-400">
            © {new Date().getFullYear()} {settings.siteName}
          </p>
        </div>
      </div>

      {/* Form panel */}
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
          <h2 className="mt-8 text-2xl font-semibold text-navy-900 lg:mt-0">Sign in to the admin panel</h2>
          <p className="mt-2 text-sm text-slate-500">Use the credentials issued by your administrator.</p>
          <LoginForm className="mt-8" />
        </div>
      </div>
    </div>
  );
}
