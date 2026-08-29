import Link from "next/link";
import { Mail, MapPin, Phone } from "lucide-react";
import {
  FacebookIcon,
  InstagramIcon,
  LinkedinIcon,
  XIcon,
  YoutubeIcon,
} from "@/components/ui/SocialIcons";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/site/Logo";
import { NewsletterForm } from "@/components/site/NewsletterForm";
import type { Settings } from "@/lib/queries";

type Item = { id: string; label: string; url: string; isExternal: boolean };

export function Footer({
  settings,
  serviceLinks,
  companyLinks,
  legalLinks,
}: {
  settings: Settings;
  serviceLinks: Item[];
  companyLinks: Item[];
  legalLinks: Item[];
}) {
  const socials = [
    { href: settings.facebook, Icon: FacebookIcon, label: "Facebook" },
    { href: settings.instagram, Icon: InstagramIcon, label: "Instagram" },
    { href: settings.linkedin, Icon: LinkedinIcon, label: "LinkedIn" },
    { href: settings.twitter, Icon: XIcon, label: "X" },
    { href: settings.youtube, Icon: YoutubeIcon, label: "YouTube" },
  ].filter((s) => s.href);

  const address = [settings.addressLine, settings.city, settings.state, settings.postalCode, settings.country]
    .filter(Boolean)
    .join(", ");

  return (
    <footer className="bg-navy-950 text-navy-200">
      <Container size="wide">
        <div className="grid gap-12 py-16 lg:grid-cols-12 lg:gap-8 lg:py-20">
          <div className="lg:col-span-4">
            <Logo src={settings.logoDark} siteName={settings.siteName} height={104} />
            <p className="mt-6 max-w-sm text-sm leading-relaxed text-navy-300">
              {settings.footerAbout || settings.description}
            </p>

            {socials.length ? (
              <div className="mt-7 flex gap-3">
                {socials.map(({ href, Icon, label }) => (
                  <a
                    key={label}
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label={label}
                    className="grid size-10 place-items-center rounded-full border border-white/15 text-navy-200 transition-all hover:-translate-y-0.5 hover:border-gold-400 hover:text-gold-300"
                  >
                    <Icon className="size-4" />
                  </a>
                ))}
              </div>
            ) : null}
          </div>

          <div className="lg:col-span-2">
            <FooterHeading>Services</FooterHeading>
            <FooterList items={serviceLinks} />
          </div>

          <div className="lg:col-span-2">
            <FooterHeading>Company</FooterHeading>
            <FooterList items={companyLinks} />
          </div>

          <div className="lg:col-span-4">
            <FooterHeading>Get in touch</FooterHeading>
            <ul className="mt-5 space-y-4 text-sm">
              {address ? (
                <li className="flex gap-3">
                  <MapPin className="mt-0.5 size-4 shrink-0 text-gold-400" aria-hidden />
                  <span className="text-navy-300">{address}</span>
                </li>
              ) : null}
              {settings.phone ? (
                <li className="flex gap-3">
                  <Phone className="mt-0.5 size-4 shrink-0 text-gold-400" aria-hidden />
                  <a href={`tel:${settings.phone.replace(/[^\d+]/g, "")}`} className="hover:text-gold-300">
                    {settings.phone}
                  </a>
                </li>
              ) : null}
              {settings.email ? (
                <li className="flex gap-3">
                  <Mail className="mt-0.5 size-4 shrink-0 text-gold-400" aria-hidden />
                  <a href={`mailto:${settings.email}`} className="break-all hover:text-gold-300">
                    {settings.email}
                  </a>
                </li>
              ) : null}
            </ul>

            <div className="mt-8">
              <p className="text-sm font-medium text-white">Monthly growth insights</p>
              <p className="mt-1 text-xs text-navy-400">No spam. Unsubscribe any time.</p>
              <NewsletterForm className="mt-4" />
            </div>
          </div>
        </div>

        <div className="flex flex-col items-center justify-between gap-4 border-t border-white/10 py-7 text-xs text-navy-400 sm:flex-row">
          <p>
            © {new Date().getFullYear()} {settings.siteName}. All rights reserved.
          </p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {legalLinks.map((item) => (
              <li key={item.id}>
                <Link href={item.url} className="transition-colors hover:text-gold-300">
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}

function FooterHeading({ children }: { children: React.ReactNode }) {
  return <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">{children}</h3>;
}

function FooterList({ items }: { items: Item[] }) {
  return (
    <ul className="mt-5 space-y-3 text-sm">
      {items.map((item) => (
        <li key={item.id}>
          <Link
            href={item.url}
            target={item.isExternal ? "_blank" : undefined}
            rel={item.isExternal ? "noopener noreferrer" : undefined}
            className="text-navy-300 transition-colors hover:text-gold-300"
          >
            {item.label}
          </Link>
        </li>
      ))}
    </ul>
  );
}
