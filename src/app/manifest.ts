import type { MetadataRoute } from "next";
import { getSettings } from "@/lib/queries";

export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const s = await getSettings();

  return {
    name: s.siteName,
    short_name: "Webeside",
    description: s.description || s.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#0f1a3c",
    theme_color: "#0f1a3c",
    icons: [
      { src: "/brand/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/brand/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
    ],
  };
}
