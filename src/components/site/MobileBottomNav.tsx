"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Briefcase, Home, Phone, Sparkles } from "lucide-react";
import { WhatsappIcon } from "@/components/ui/SocialIcons";
import { cn } from "@/lib/utils";

/**
 * Thumb-reach navigation for phones. The two right-hand slots are the actions
 * that actually convert — calling and WhatsApp — so they sit where the thumb
 * naturally lands.
 */
export function MobileBottomNav({
  phone,
  whatsapp,
  siteName,
}: {
  phone: string;
  whatsapp: string;
  siteName: string;
}) {
  const pathname = usePathname();

  const links = [
    { href: "/", label: "Home", icon: Home },
    { href: "/services", label: "Services", icon: Sparkles },
    { href: "/portfolio", label: "Work", icon: Briefcase },
  ];

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  const waDigits = whatsapp.replace(/[^\d]/g, "");
  const waText = encodeURIComponent(`Hi ${siteName}, I'd like to discuss a project.`);

  return (
    <nav
      aria-label="Quick navigation"
      className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-navy-950/95 backdrop-blur lg:hidden"
      style={{ paddingBottom: "env(safe-area-inset-bottom)" }}
    >
      <ul className="mx-auto grid max-w-lg grid-cols-5">
        {links.map(({ href, label, icon: Icon }) => (
          <li key={href}>
            <Link
              href={href}
              aria-current={isActive(href) ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium transition-colors",
                isActive(href) ? "text-gold-300" : "text-navy-300 hover:text-white",
              )}
            >
              <Icon className="size-5" aria-hidden />
              {label}
            </Link>
          </li>
        ))}

        <li>
          {phone ? (
            <a
              href={`tel:${phone.replace(/[^\d+]/g, "")}`}
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-navy-300 transition-colors hover:text-gold-300"
            >
              <Phone className="size-5" aria-hidden />
              Call
            </a>
          ) : (
            <Link
              href="/contact"
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-navy-300 hover:text-gold-300"
            >
              <Phone className="size-5" aria-hidden />
              Contact
            </Link>
          )}
        </li>

        <li>
          {waDigits ? (
            <a
              href={`https://wa.me/${waDigits}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-[#25D366] transition-opacity hover:opacity-80"
            >
              <WhatsappIcon className="size-5" aria-hidden />
              WhatsApp
            </a>
          ) : (
            <Link
              href="/contact"
              className="flex flex-col items-center gap-1 py-2.5 text-[10px] font-medium text-gold-300"
            >
              <Sparkles className="size-5" aria-hidden />
              Enquire
            </Link>
          )}
        </li>
      </ul>
    </nav>
  );
}
