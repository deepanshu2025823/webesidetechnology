import { redirect } from "next/navigation";
import Image from "next/image";
import Link from "next/link";
import { LogOut } from "lucide-react";
import { getPortalSession } from "@/lib/portal-auth";
import { portalLogout } from "@/app/admin/actions/portal";
import { PortalNav } from "@/components/portal/PortalNav";
import { getSettings } from "@/lib/queries";

export default async function PortalAppLayout({ children }: { children: React.ReactNode }) {
  const session = await getPortalSession();
  if (!session) redirect("/portal/login");
  const settings = await getSettings();

  return (
    <div className="min-h-screen">
      <header className="bg-navy-950">
        <div aria-hidden className="h-0.5 w-full bg-gradient-to-r from-gold-700 via-gold-400 to-gold-700" />
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <Link href="/portal" className="flex items-center gap-3">
            <Image src="/brand/logo-mark-light.png" alt="" width={512} height={666} className="h-8 w-auto" />
            <span className="flex flex-col leading-none">
              <span className="font-display text-base font-semibold tracking-wide text-gold-400">
                {settings.siteName.split(" ")[0]}
              </span>
              <span className="mt-1 text-[0.6rem] font-medium uppercase tracking-[0.28em] text-navy-300">
                Client portal
              </span>
            </span>
          </Link>

          <div className="flex items-center gap-4">
            <span className="hidden text-right sm:block">
              <span className="block text-sm font-medium text-white">{session.clientName}</span>
              <span className="block text-xs text-navy-400">{session.name}</span>
            </span>
            <form action={portalLogout}>
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 px-3 py-2 text-xs font-medium text-navy-200 hover:border-gold-400 hover:text-gold-300"
              >
                <LogOut className="size-3.5" aria-hidden /> Sign out
              </button>
            </form>
          </div>
        </div>

        <PortalNav />
      </header>

      <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6">{children}</main>
    </div>
  );
}
