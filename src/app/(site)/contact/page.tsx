import { Clock, Mail, MapPin, MessageCircle, Phone } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { PageHero } from "@/components/site/PageHero";
import { ContactForm } from "@/components/site/ContactForm";
import { JsonLd } from "@/components/JsonLd";
import { getServices, getSettings } from "@/lib/queries";
import { breadcrumbJsonLd, buildMetadata } from "@/lib/seo";
import { absoluteUrl } from "@/lib/utils";

export async function generateMetadata() {
  const s = await getSettings();
  return buildMetadata({
    title: "Contact Us",
    description: `Talk to ${s.siteName} about your website, app or marketing campaign. Free consultation, response within one working day.`,
    path: "/contact",
  });
}

export default async function ContactPage() {
  const [settings, services] = await Promise.all([getSettings(), getServices()]);

  const address = [settings.addressLine, settings.city, settings.state, settings.postalCode, settings.country]
    .filter(Boolean)
    .join(", ");

  const channels = [
    settings.phone && { icon: Phone, label: "Call us", value: settings.phone, href: `tel:${settings.phone.replace(/[^\d+]/g, "")}` },
    settings.whatsapp && {
      icon: MessageCircle,
      label: "WhatsApp",
      value: settings.whatsapp,
      href: `https://wa.me/${settings.whatsapp.replace(/[^\d]/g, "")}`,
    },
    settings.email && { icon: Mail, label: "Email", value: settings.email, href: `mailto:${settings.email}` },
    address && { icon: MapPin, label: "Office", value: address, href: null },
    settings.workingHours && { icon: Clock, label: "Hours", value: settings.workingHours, href: null },
  ].filter(Boolean) as { icon: typeof Phone; label: string; value: string; href: string | null }[];

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Contact", path: "/contact" }])} />
      <JsonLd
        data={{
          "@context": "https://schema.org",
          "@type": "ContactPage",
          url: absoluteUrl("/contact"),
          name: `Contact ${settings.siteName}`,
        }}
      />

      <PageHero
        eyebrow="Get in touch"
        title="Let's scope your next project"
        description="Send a brief and we'll come back with an approach, a timeline and an honest price — usually within one working day."
        crumbs={[{ name: "Contact", path: "/contact" }]}
      />

      <section className="py-16 sm:py-20">
        <Container size="wide">
          <div className="grid gap-12 lg:grid-cols-12">
            <div className="lg:col-span-5">
              <h2 className="text-2xl text-navy-900">Talk to a human</h2>
              <p className="mt-3 text-base leading-relaxed text-slate-600">
                No call-centre scripts. You speak to the people who will actually run your project.
              </p>

              <ul className="mt-9 space-y-5">
                {channels.map(({ icon: Icon, label, value, href }) => (
                  <li key={label} className="flex gap-4">
                    <span className="grid size-11 shrink-0 place-items-center rounded-xl bg-navy-900 text-gold-400">
                      <Icon className="size-5" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                      {href ? (
                        <a
                          href={href}
                          target={href.startsWith("http") ? "_blank" : undefined}
                          rel={href.startsWith("http") ? "noopener noreferrer" : undefined}
                          className="break-words text-base font-medium text-navy-900 transition-colors hover:text-gold-700"
                        >
                          {value}
                        </a>
                      ) : (
                        <p className="break-words text-base font-medium text-navy-900">{value}</p>
                      )}
                    </div>
                  </li>
                ))}
              </ul>

              {settings.mapEmbedUrl ? (
                <div className="mt-10 overflow-hidden rounded-2xl border border-navy-900/10">
                  <iframe
                    src={settings.mapEmbedUrl}
                    title={`${settings.siteName} location`}
                    className="h-64 w-full"
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                  />
                </div>
              ) : null}
            </div>

            <div className="lg:col-span-7">
              <div className="rounded-3xl border border-navy-900/10 bg-cream p-7 shadow-sm sm:p-9">
                <h2 className="text-2xl text-navy-900">Project enquiry</h2>
                <p className="mt-2 text-sm text-slate-600">Fields marked * are required.</p>
                <ContactForm className="mt-7" services={services.map((s) => s.title)} />
              </div>
            </div>
          </div>
        </Container>
      </section>
    </>
  );
}
