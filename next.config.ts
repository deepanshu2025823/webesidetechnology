import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Editors can paste an image URL in the admin panel, so allow any HTTPS
    // host to be optimised. Uploaded files are served from /uploads locally.
    remotePatterns: [{ protocol: "https", hostname: "**" }],
    formats: ["image/avif", "image/webp"],
  },
  poweredByHeader: false,
  compress: true,
  // `next dev` binds 0.0.0.0, so the panel is reachable over 127.0.0.1 and the
  // LAN IP as well as localhost. Without these the dev server blocks its own
  // HMR and chunk requests from those hosts.
  allowedDevOrigins: ["localhost", "127.0.0.1", "10.*.*.*", "172.*.*.*", "192.168.*.*"],
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "SAMEORIGIN" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
      {
        // A printed invoice must always show what is currently in the database,
        // so the print tab is never served from the browser's cache.
        source: "/admin/print/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, no-cache, must-revalidate, max-age=0" }],
      },
      {
        source: "/uploads/:path*",
        headers: [{ key: "Cache-Control", value: "public, max-age=31536000, immutable" }],
      },
    ];
  },
};

export default nextConfig;
