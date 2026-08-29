import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/queries";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();

  return {
    name: s.siteName,
    short_name: "Sahab India",
    description: s.description || s.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#011460",
    theme_color: "#011460",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
