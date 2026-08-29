import type { Metadata } from "next";
import { PrintTrigger } from "@/components/admin/PrintTrigger";

export const metadata: Metadata = {
  title: "Document",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

/** Bare white page so the browser's print dialog produces a clean PDF. */
export default function PrintLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white">
      <PrintTrigger />
      {children}
    </div>
  );
}
