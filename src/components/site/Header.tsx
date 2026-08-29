"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { ChevronDown, Menu, Phone, X } from "lucide-react";
import { Container } from "@/components/ui/Container";
import { Logo } from "@/components/site/Logo";
import { buttonClass } from "@/components/ui/Button";
import { cn } from "@/lib/utils";

export type NavNode = {
  id: string;
  label: string;
  url: string;
  isExternal: boolean;
  children: { id: string; label: string; url: string; isExternal: boolean }[];
};

export function Header({
  nav,
  logo,
  siteName,
  phone,
  ctaLabel,
  ctaUrl,
}: {
  nav: NavNode[];
  /** Full lockup for a dark surface; the header sizes it by height. */
  logo: string;
  siteName: string;
  phone: string;
  ctaLabel: string;
  ctaUrl: string;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const [lastPath, setLastPath] = useState(pathname);

  // Navigating closes the drawer. Adjusting state during render is the pattern
  // React recommends over an effect that immediately calls setState.
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
    setOpenGroup(null);
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? "hidden" : "";
    return () => {
      document.body.style.overflow = "";
    };
  }, [open]);

  const isActive = (url: string) => (url === "/" ? pathname === "/" : pathname.startsWith(url));

  return (
    <header
      className={cn(
        "sticky top-0 z-50 transition-all duration-300",
        scrolled ? "bg-navy-950/95 shadow-brand backdrop-blur-md" : "bg-navy-950",
      )}
    >
      <div className="h-0.5 w-full bg-gradient-to-r from-gold-700 via-gold-400 to-gold-700" />
      <Container size="wide">
        <div className={cn("flex items-center justify-between transition-all", scrolled ? "h-16" : "h-20")}>
          <Logo src={logo} siteName={siteName} height={scrolled ? 40 : 50} priority />

          <nav className="hidden items-center gap-1 lg:flex" aria-label="Primary">
            {nav.map((item) =>
              item.children.length ? (
                <div key={item.id} className="group relative">
                  <button
                    type="button"
                    className={cn(
                      "flex items-center gap-1 rounded-full px-4 py-2 text-sm font-medium transition-colors",
                      isActive(item.url) ? "text-gold-300" : "text-navy-100 hover:text-gold-300",
                    )}
                    aria-expanded={false}
                  >
                    {item.label}
                    <ChevronDown className="size-4 transition-transform group-hover:rotate-180" aria-hidden />
                  </button>
                  <div className="invisible absolute left-1/2 top-full z-50 w-64 -translate-x-1/2 pt-3 opacity-0 transition-all duration-200 group-hover:visible group-hover:opacity-100 group-focus-within:visible group-focus-within:opacity-100">
                    <ul className="overflow-hidden rounded-2xl border border-navy-100 bg-white p-2 shadow-brand">
                      {item.children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={child.url}
                            className="block rounded-xl px-4 py-2.5 text-sm text-navy-800 transition-colors hover:bg-gold-50 hover:text-gold-800"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : (
                <Link
                  key={item.id}
                  href={item.url}
                  target={item.isExternal ? "_blank" : undefined}
                  rel={item.isExternal ? "noopener noreferrer" : undefined}
                  className={cn(
                    "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                    isActive(item.url) ? "text-gold-300" : "text-navy-100 hover:text-gold-300",
                  )}
                >
                  {item.label}
                </Link>
              ),
            )}
          </nav>

          <div className="hidden items-center gap-3 lg:flex">
            {phone ? (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                className="flex items-center gap-2 text-sm font-medium text-navy-100 transition-colors hover:text-gold-300"
              >
                <Phone className="size-4" aria-hidden />
                {phone}
              </a>
            ) : null}
            <Link href={ctaUrl || "/contact"} className={buttonClass("primary", "sm")}>
              {ctaLabel || "Get a quote"}
            </Link>
          </div>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            className="rounded-lg p-2 text-white transition-colors hover:bg-white/10 lg:hidden"
            aria-label={open ? "Close menu" : "Open menu"}
            aria-expanded={open}
          >
            {open ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </Container>

      {/* Mobile drawer */}
      <div
        className={cn(
          "overflow-hidden border-t border-white/10 bg-navy-950 transition-[max-height] duration-300 lg:hidden",
          open ? "max-h-[calc(100vh-5rem)] overflow-y-auto" : "max-h-0",
        )}
      >
        <Container>
          <nav className="flex flex-col gap-1 py-5" aria-label="Mobile">
            {nav.map((item) =>
              item.children.length ? (
                <div key={item.id} className="border-b border-white/5 pb-1">
                  <button
                    type="button"
                    onClick={() => setOpenGroup((g) => (g === item.id ? null : item.id))}
                    className="flex w-full items-center justify-between px-2 py-3 text-left text-base font-medium text-navy-100"
                    aria-expanded={openGroup === item.id}
                  >
                    {item.label}
                    <ChevronDown
                      className={cn("size-5 transition-transform", openGroup === item.id && "rotate-180")}
                      aria-hidden
                    />
                  </button>
                  {openGroup === item.id ? (
                    <ul className="flex flex-col gap-0.5 pb-2 pl-4">
                      {item.children.map((child) => (
                        <li key={child.id}>
                          <Link
                            href={child.url}
                            className="block rounded-lg px-2 py-2.5 text-sm text-navy-200 hover:text-gold-300"
                          >
                            {child.label}
                          </Link>
                        </li>
                      ))}
                    </ul>
                  ) : null}
                </div>
              ) : (
                <Link
                  key={item.id}
                  href={item.url}
                  className="border-b border-white/5 px-2 py-3 text-base font-medium text-navy-100 hover:text-gold-300"
                >
                  {item.label}
                </Link>
              ),
            )}
            <Link href={ctaUrl || "/contact"} className={buttonClass("primary", "md", "mt-4 w-full")}>
              {ctaLabel || "Get a quote"}
            </Link>
            {phone ? (
              <a
                href={`tel:${phone.replace(/[^\d+]/g, "")}`}
                className="mt-2 flex items-center justify-center gap-2 py-2 text-sm text-navy-200"
              >
                <Phone className="size-4" aria-hidden />
                {phone}
              </a>
            ) : null}
          </nav>
        </Container>
      </div>
    </header>
  );
}
