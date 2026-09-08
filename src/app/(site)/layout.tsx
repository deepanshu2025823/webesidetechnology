import { Header, type NavNode } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { JsonLd } from "@/components/JsonLd";
import { WhatsAppButton } from "@/components/site/WhatsAppButton";
import { MobileBottomNav } from "@/components/site/MobileBottomNav";
import { ChatWidget } from "@/components/site/ChatWidget";
import { getMenu, getSettings } from "@/lib/queries";
import { organizationJsonLd } from "@/lib/seo";

// Content is admin-managed, so pages rebuild on a short interval and are
// revalidated immediately whenever an editor saves.
export const revalidate = 300;

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const [settings, header, footerServices, footerCompany, legal, jsonLd] = await Promise.all([
    getSettings(),
    getMenu("HEADER"),
    getMenu("FOOTER_SERVICES"),
    getMenu("FOOTER_COMPANY"),
    getMenu("LEGAL"),
    organizationJsonLd(),
  ]);

  const nav: NavNode[] = header.map((item) => ({
    id: item.id,
    label: item.label,
    url: item.url,
    isExternal: item.isExternal,
    children: item.children.map((c) => ({
      id: c.id,
      label: c.label,
      url: c.url,
      isExternal: c.isExternal,
    })),
  }));

  const flatten = (items: { id: string; label: string; url: string; isExternal: boolean }[]) =>
    items.map(({ id, label, url, isExternal }) => ({ id, label, url, isExternal }));

  return (
    <>
      <JsonLd data={jsonLd} />
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-[100] focus:rounded-full focus:bg-gold-500 focus:px-5 focus:py-2 focus:text-sm focus:font-semibold focus:text-navy-950"
      >
        Skip to content
      </a>
      <Header
        nav={nav}
        logo={settings.logoDark}
        siteName={settings.siteName}
        phone={settings.phone}
        ctaLabel={settings.ctaButton}
        ctaUrl={settings.ctaUrl}
      />
      {/*
        The clearance for the fixed mobile bar belongs on the footer, not here —
        the bar overlaps whatever is last on the page, and that is the footer's
        legal row rather than the content above it.
      */}
      <main id="main">{children}</main>
      <Footer
        settings={settings}
        serviceLinks={flatten(footerServices)}
        companyLinks={flatten(footerCompany)}
        legalLinks={flatten(legal)}
      />
      {/* The floating button is desktop-only; on phones WhatsApp lives in the bottom bar. */}
      {settings.whatsapp ? <WhatsAppButton number={settings.whatsapp} siteName={settings.siteName} /> : null}

      <ChatWidget siteName={settings.siteName} />

      <MobileBottomNav phone={settings.phone} whatsapp={settings.whatsapp} siteName={settings.siteName} />
    </>
  );
}
