import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Admin",
  robots: { index: false, follow: false },
};

// The admin area is always rendered per-request; nothing here may be cached.
export const dynamic = "force-dynamic";

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  // overflow-x-clip contains the off-canvas sidebar: while closed it sits at a
  // negative offset, which otherwise inflates document.scrollWidth.
  return <div className="min-h-screen overflow-x-clip bg-slate-50 text-navy-900">{children}</div>;
}
