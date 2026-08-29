import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/queries";
import { absoluteUrl } from "@/lib/utils";

export const revalidate = 3600;

export default async function robots(): Promise<MetadataRoute.Robots> {
  const settings = await getSettings();

  // A single switch in admin settings takes the whole site out of the index,
  // which is what you want while a staging copy is live.
  if (!settings.robotsIndexable) {
    return { rules: [{ userAgent: "*", disallow: "/" }] };
  }

  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/admin", "/admin/", "/api/"],
      },
    ],
    sitemap: absoluteUrl("/sitemap.xml"),
    host: absoluteUrl("/"),
  };
}
