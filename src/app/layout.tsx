import type { Metadata, Viewport } from "next";
import Script from "next/script";
import localFont from "next/font/local";
import "./globals.css";
import { getSettings } from "@/lib/queries";
import { buildMetadata } from "@/lib/seo";
import { siteUrl } from "@/lib/utils";

/*
 * Self-hosted rather than next/font/google: the Google variant downloads the
 * files during `next build`, and twice a deploy failed because the build
 * server could not reach fonts.gstatic.com. These are the same families
 * (Latin, variable weight) from Fontsource, under the SIL Open Font License,
 * so the build needs nothing from the network.
 */
const playfair = localFont({
  src: "./fonts/PlayfairDisplay-Variable.woff2",
  variable: "--font-playfair",
  display: "swap",
  weight: "400 900",
});

const jakarta = localFont({
  src: "./fonts/PlusJakartaSans-Variable.woff2",
  variable: "--font-jakarta",
  display: "swap",
  weight: "200 800",
});

export const viewport: Viewport = {
  themeColor: "#011460",
  width: "device-width",
  initialScale: 1,
};

export async function generateMetadata(): Promise<Metadata> {
  const settings = await getSettings();
  const base = await buildMetadata();

  return {
    ...base,
    metadataBase: new URL(siteUrl()),
    applicationName: settings.siteName,
    manifest: "/manifest.webmanifest",
    icons: {
      icon: [
        { url: "/favicon.ico", sizes: "any" },
        { url: "/brand/icon-192.png", type: "image/png", sizes: "192x192" },
        { url: "/brand/icon-512.png", type: "image/png", sizes: "512x512" },
      ],
      apple: "/apple-icon.png",
    },
    ...(settings.searchConsoleId ? { verification: { google: settings.searchConsoleId } } : {}),
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const settings = await getSettings();

  return (
    <html lang="en" className={`${playfair.variable} ${jakarta.variable}`}>
      <body className="min-h-screen bg-white antialiased">
        {settings.gtmContainerId ? (
          <>
            <Script id="gtm" strategy="afterInteractive">
              {`(function(w,d,s,l,i){w[l]=w[l]||[];w[l].push({'gtm.start':new Date().getTime(),event:'gtm.js'});
              var f=d.getElementsByTagName(s)[0],j=d.createElement(s),dl=l!='dataLayer'?'&l='+l:'';
              j.async=true;j.src='https://www.googletagmanager.com/gtm.js?id='+i+dl;f.parentNode.insertBefore(j,f);
              })(window,document,'script','dataLayer','${settings.gtmContainerId}');`}
            </Script>
            <noscript>
              <iframe
                src={`https://www.googletagmanager.com/ns.html?id=${settings.gtmContainerId}`}
                height="0"
                width="0"
                style={{ display: "none", visibility: "hidden" }}
                title="Google Tag Manager"
              />
            </noscript>
          </>
        ) : null}

        {settings.gaMeasurementId && !settings.gtmContainerId ? (
          <>
            <Script
              src={`https://www.googletagmanager.com/gtag/js?id=${settings.gaMeasurementId}`}
              strategy="afterInteractive"
            />
            <Script id="ga" strategy="afterInteractive">
              {`window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}
              gtag('js',new Date());gtag('config','${settings.gaMeasurementId}');`}
            </Script>
          </>
        ) : null}

        {children}
      </body>
    </html>
  );
}
