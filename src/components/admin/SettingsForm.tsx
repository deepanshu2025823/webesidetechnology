"use client";

import { useActionState, useState } from "react";
import { saveSettings, type ActionState } from "@/app/admin/actions/content";
import { Alert, Card, FieldWrap, SubmitButton, Toggle, inputClass } from "@/components/admin/ui";
import { ImageInput } from "@/components/admin/ImageInput";
import { cn } from "@/lib/utils";

type Settings = Record<string, string | boolean | number | Date>;

const TABS = [
  { id: "brand", label: "Brand" },
  { id: "contact", label: "Contact" },
  { id: "social", label: "Social" },
  { id: "cta", label: "Call to action" },
  { id: "videos", label: "Video carousel" },
  { id: "seo", label: "SEO & analytics" },
] as const;

export function SettingsForm({ settings }: { settings: Settings }) {
  const [state, action] = useActionState<ActionState, FormData>(saveSettings, {});
  const [tab, setTab] = useState<(typeof TABS)[number]["id"]>("brand");

  const value = (key: string) => String(settings[key] ?? "");

  return (
    <form action={action} className="space-y-6">
      {state.error ? <Alert tone="error">{state.error}</Alert> : null}
      {state.message ? <Alert tone="success">{state.message}</Alert> : null}

      <nav className="flex flex-wrap gap-2" aria-label="Settings sections">
        {TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            aria-current={tab === t.id}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              tab === t.id
                ? "bg-navy-900 text-white"
                : "border border-navy-900/15 text-navy-700 hover:border-gold-500 hover:bg-gold-50",
            )}
          >
            {t.label}
          </button>
        ))}
      </nav>

      {/* All panels stay mounted so one save submits every field. */}
      <div className={tab === "brand" ? "space-y-6" : "hidden"}>
        <Card title="Identity">
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldWrap label="Site name" htmlFor="siteName">
              <input id="siteName" name="siteName" defaultValue={value("siteName")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="Tagline" htmlFor="tagline">
              <input id="tagline" name="tagline" defaultValue={value("tagline")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="Company description" htmlFor="description" className="sm:col-span-2" help="Used in structured data and as a meta fallback.">
              <textarea id="description" name="description" rows={3} defaultValue={value("description")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="Footer blurb" htmlFor="footerAbout" className="sm:col-span-2">
              <textarea id="footerAbout" name="footerAbout" rows={3} defaultValue={value("footerAbout")} className={inputClass} />
            </FieldWrap>
          </div>
        </Card>

        <Card title="Logos" description="The dark logo is used on the navy header and footer.">
          <div className="grid gap-6 sm:grid-cols-2">
            <FieldWrap label="Logo — light backgrounds">
              <ImageInput name="logoLight" defaultValue={value("logoLight")} folder="brand" />
            </FieldWrap>
            <FieldWrap label="Logo — dark backgrounds">
              <ImageInput name="logoDark" defaultValue={value("logoDark")} folder="brand" />
            </FieldWrap>
            <FieldWrap label="Compact mark">
              <ImageInput name="logoMark" defaultValue={value("logoMark")} folder="brand" />
            </FieldWrap>
            <FieldWrap label="Default social share image" help="1200 × 630 px works best.">
              <ImageInput name="ogImage" defaultValue={value("ogImage")} folder="brand" />
            </FieldWrap>
          </div>
        </Card>
      </div>

      <div className={tab === "contact" ? "space-y-6" : "hidden"}>
        <Card title="Contact details">
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldWrap label="Primary email" htmlFor="email">
              <input id="email" name="email" type="email" defaultValue={value("email")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="Secondary email" htmlFor="altEmail">
              <input id="altEmail" name="altEmail" type="email" defaultValue={value("altEmail")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="Phone" htmlFor="phone">
              <input id="phone" name="phone" defaultValue={value("phone")} placeholder="+91 98xxxxxxxx" className={inputClass} />
            </FieldWrap>
            <FieldWrap label="Alternate phone" htmlFor="altPhone">
              <input id="altPhone" name="altPhone" defaultValue={value("altPhone")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="WhatsApp number" htmlFor="whatsapp" help="Adds the floating WhatsApp button. Include the country code.">
              <input id="whatsapp" name="whatsapp" defaultValue={value("whatsapp")} placeholder="+919812345678" className={inputClass} />
            </FieldWrap>
            <FieldWrap label="Working hours" htmlFor="workingHours">
              <input id="workingHours" name="workingHours" defaultValue={value("workingHours")} className={inputClass} />
            </FieldWrap>
          </div>
        </Card>

        <Card title="Address">
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldWrap label="Street address" htmlFor="addressLine" className="sm:col-span-2">
              <input id="addressLine" name="addressLine" defaultValue={value("addressLine")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="City" htmlFor="city">
              <input id="city" name="city" defaultValue={value("city")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="State" htmlFor="state">
              <input id="state" name="state" defaultValue={value("state")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="PIN code" htmlFor="postalCode">
              <input id="postalCode" name="postalCode" defaultValue={value("postalCode")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="Country" htmlFor="country">
              <input id="country" name="country" defaultValue={value("country")} className={inputClass} />
            </FieldWrap>
            <FieldWrap
              label="Google Maps embed URL"
              htmlFor="mapEmbedUrl"
              className="sm:col-span-2"
              help="In Google Maps choose Share → Embed a map, then paste only the src URL."
            >
              <input id="mapEmbedUrl" name="mapEmbedUrl" defaultValue={value("mapEmbedUrl")} className={inputClass} />
            </FieldWrap>
          </div>
        </Card>
      </div>

      <div className={tab === "social" ? "space-y-6" : "hidden"}>
        <Card title="Social profiles" description="Blank fields are hidden from the site.">
          <div className="grid gap-5 sm:grid-cols-2">
            {[
              ["facebook", "Facebook"],
              ["instagram", "Instagram"],
              ["linkedin", "LinkedIn"],
              ["twitter", "X (Twitter)"],
              ["youtube", "YouTube"],
            ].map(([key, label]) => (
              <FieldWrap key={key} label={label} htmlFor={key}>
                {/*
                  type="text", not type="url": these live in a tab that is
                  hidden when another is open, and a browser validation failure
                  on a hidden field blocks the whole save with no message.
                  Missing schemes are added server-side instead.
                */}
                <input
                  id={key}
                  name={key}
                  type="text"
                  inputMode="url"
                  defaultValue={value(key)}
                  placeholder="https://"
                  className={inputClass}
                />
              </FieldWrap>
            ))}
          </div>
        </Card>
      </div>

      <div className={tab === "cta" ? "space-y-6" : "hidden"}>
        <Card title="Call-to-action band" description="Appears at the bottom of most pages.">
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldWrap label="Heading" htmlFor="ctaTitle" className="sm:col-span-2">
              <input id="ctaTitle" name="ctaTitle" defaultValue={value("ctaTitle")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="Sub-heading" htmlFor="ctaSubtitle" className="sm:col-span-2">
              <textarea id="ctaSubtitle" name="ctaSubtitle" rows={2} defaultValue={value("ctaSubtitle")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="Button text" htmlFor="ctaButton">
              <input id="ctaButton" name="ctaButton" defaultValue={value("ctaButton")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="Button link" htmlFor="ctaUrl">
              <input id="ctaUrl" name="ctaUrl" defaultValue={value("ctaUrl")} className={inputClass} />
            </FieldWrap>
          </div>
        </Card>
      </div>

      <div className={tab === "videos" ? "space-y-6" : "hidden"}>
        <Card
          title="Home-page video carousel"
          description="The videos themselves are managed under Website → Video carousel."
        >
          <div className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Toggle
                name="videoEnabled"
                label="Show the video carousel"
                defaultChecked={settings.videoEnabled !== false}
                help="Turn off to hide the whole section without deleting any videos."
              />
            </div>
            <FieldWrap label="Section heading" htmlFor="videoTitle">
              <input id="videoTitle" name="videoTitle" defaultValue={value("videoTitle")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="Videos per row" htmlFor="videoPerRow" help="On desktop. 1–6; smaller screens adapt on their own.">
              <select
                id="videoPerRow"
                name="videoPerRow"
                defaultValue={String(settings.videoPerRow ?? 3)}
                className={inputClass}
              >
                {[1, 2, 3, 4, 5, 6].map((n) => (
                  <option key={n} value={n}>
                    {n} per row
                  </option>
                ))}
              </select>
            </FieldWrap>
            <FieldWrap label="Section sub-heading" htmlFor="videoSubtitle" className="sm:col-span-2">
              <textarea
                id="videoSubtitle"
                name="videoSubtitle"
                rows={2}
                defaultValue={value("videoSubtitle")}
                className={inputClass}
              />
            </FieldWrap>
          </div>
        </Card>
      </div>

      <div className={tab === "seo" ? "space-y-6" : "hidden"}>
        <Card title="Default metadata" description="Used on any page without its own meta tags.">
          <div className="grid gap-5">
            <FieldWrap label="Default meta title" htmlFor="metaTitle">
              <input id="metaTitle" name="metaTitle" defaultValue={value("metaTitle")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="Default meta description" htmlFor="metaDescription">
              <textarea id="metaDescription" name="metaDescription" rows={3} defaultValue={value("metaDescription")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="Default keywords" htmlFor="metaKeywords" help="Comma separated.">
              <input id="metaKeywords" name="metaKeywords" defaultValue={value("metaKeywords")} className={inputClass} />
            </FieldWrap>
          </div>
        </Card>

        <Card title="Structured data">
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldWrap label="Organisation type" htmlFor="schemaOrgType" help="Use LocalBusiness if you serve walk-in clients.">
              <select id="schemaOrgType" name="schemaOrgType" defaultValue={value("schemaOrgType") || "Organization"} className={inputClass}>
                <option value="Organization">Organization</option>
                <option value="LocalBusiness">LocalBusiness</option>
                <option value="ProfessionalService">ProfessionalService</option>
                <option value="Corporation">Corporation</option>
              </select>
            </FieldWrap>
            <FieldWrap label="Founded (year)" htmlFor="foundingYear">
              <input id="foundingYear" name="foundingYear" placeholder="2019" defaultValue={value("foundingYear")} className={inputClass} />
            </FieldWrap>
          </div>
        </Card>

        <Card title="Analytics & verification">
          <div className="grid gap-5 sm:grid-cols-2">
            <FieldWrap label="Google Analytics ID" htmlFor="gaMeasurementId" help="e.g. G-XXXXXXXXXX">
              <input id="gaMeasurementId" name="gaMeasurementId" defaultValue={value("gaMeasurementId")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="Google Tag Manager ID" htmlFor="gtmContainerId" help="e.g. GTM-XXXXXXX. Takes priority over the GA ID.">
              <input id="gtmContainerId" name="gtmContainerId" defaultValue={value("gtmContainerId")} className={inputClass} />
            </FieldWrap>
            <FieldWrap label="Search Console verification" htmlFor="searchConsoleId" className="sm:col-span-2" help="The content value from the HTML meta tag method.">
              <input id="searchConsoleId" name="searchConsoleId" defaultValue={value("searchConsoleId")} className={inputClass} />
            </FieldWrap>
          </div>
        </Card>

        <Card title="Indexing">
          <Toggle
            name="robotsIndexable"
            label="Allow search engines to index this site"
            help="Turn this off on a staging copy. It rewrites robots.txt and every page's robots meta tag."
            defaultChecked={Boolean(settings.robotsIndexable)}
          />
        </Card>
      </div>

      <div className="sticky bottom-0 -mx-4 flex justify-end border-t border-navy-900/10 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        <SubmitButton>Save settings</SubmitButton>
      </div>
    </form>
  );
}
