"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/portal", label: "Overview" },
  { href: "/portal/projects", label: "Projects" },
  { href: "/portal/approvals", label: "Approvals" },
  { href: "/portal/invoices", label: "Invoices" },
  { href: "/portal/documents", label: "Documents" },
  { href: "/portal/tickets", label: "Requests" },
];

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="mx-auto max-w-6xl px-4 sm:px-6" aria-label="Portal">
      <ul className="scroll-slim flex gap-1 overflow-x-auto">
        {LINKS.map((link) => {
          const active = link.href === "/portal" ? pathname === "/portal" : pathname.startsWith(link.href);
          return (
            <li key={link.href}>
              <Link
                href={link.href}
                className={cn(
                  "block whitespace-nowrap border-b-2 px-4 py-3 text-sm font-medium transition-colors",
                  active ? "border-gold-400 text-gold-300" : "border-transparent text-navy-300 hover:text-white",
                )}
              >
                {link.label}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
