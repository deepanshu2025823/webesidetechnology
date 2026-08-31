"use client";

import { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  BadgeIndianRupee,
  BarChart3,
  Briefcase,
  Building2,
  Calculator,
  CalendarCheck,
  CalendarDays,
  ChevronDown,
  Clapperboard,
  FileSignature,
  FileText,
  Files,
  Folder,
  FolderOpen,
  Globe,
  Handshake,
  Image as ImageIcon,
  LayoutDashboard,
  LifeBuoy,
  ListChecks,
  LogOut,
  Mail,
  Megaphone,
  Menu as MenuIcon,
  MessageCircle,
  MessageSquareQuote,
  Newspaper,
  PartyPopper,
  Plane,
  Plug,
  Receipt,
  RefreshCw,
  Route,
  Search,
  Settings,
  Sparkles,
  Star,
  Tags,
  Target,
  TrendingDown,
  UserCog,
  Users,
  Wallet,
  Workflow,
  X,
} from "lucide-react";
import { logoutAction } from "@/app/admin/actions/auth";
import { canView, ROLE_LABELS, type ModuleKey } from "@/lib/permissions";
import type { Role } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

type Item = { href: string; label: string; icon: typeof LayoutDashboard; module: ModuleKey };

const GROUPS: { title: string; items: Item[] }[] = [
  {
    title: "Operations",
    items: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, module: "dashboard" },
      { href: "/admin/leads", label: "Leads", icon: Target, module: "leads" },
      { href: "/admin/chats", label: "Live chat", icon: MessageCircle, module: "chats" },
      { href: "/admin/clients", label: "Clients", icon: Building2, module: "clients" },
      { href: "/admin/quotations", label: "Quotations", icon: FileSignature, module: "quotations" },
      { href: "/admin/client-projects", label: "Projects", icon: Briefcase, module: "projects" },
      { href: "/admin/tasks", label: "Tasks", icon: ListChecks, module: "tasks" },
    ],
  },
  {
    title: "Money",
    items: [
      { href: "/admin/finance", label: "Finance", icon: Wallet, module: "finance" },
      { href: "/admin/finance/invoices", label: "Invoices", icon: Receipt, module: "finance" },
      { href: "/admin/finance/expenses", label: "Expenses", icon: TrendingDown, module: "finance" },
      { href: "/admin/renewals", label: "Renewals", icon: RefreshCw, module: "renewals" },
    ],
  },
  {
    title: "Delivery",
    items: [
      { href: "/admin/campaigns/social", label: "Social calendar", icon: CalendarDays, module: "campaigns" },
      { href: "/admin/campaigns/seo", label: "SEO plans", icon: Search, module: "campaigns" },
      { href: "/admin/campaigns/ads", label: "Ad campaigns", icon: Megaphone, module: "campaigns" },
      { href: "/admin/campaigns/pr", label: "PR", icon: Newspaper, module: "campaigns" },
      { href: "/admin/media-contacts", label: "Media contacts", icon: Mail, module: "campaigns" },
      { href: "/admin/events", label: "Events", icon: PartyPopper, module: "events" },
    ],
  },
  {
    title: "People",
    items: [
      { href: "/admin/hr/employees", label: "Employees", icon: Users, module: "team" },
      { href: "/admin/hr/attendance", label: "Attendance", icon: CalendarCheck, module: "team" },
      { href: "/admin/hr/leave", label: "Leave", icon: Plane, module: "team" },
      { href: "/admin/hr/payroll", label: "Payroll", icon: BadgeIndianRupee, module: "payroll" },
    ],
  },
  {
    title: "Growth network",
    items: [
      { href: "/admin/influencers", label: "Influencers", icon: Star, module: "influencers" },
      { href: "/admin/influencer-campaigns", label: "Collaborations", icon: Sparkles, module: "influencers" },
      { href: "/admin/partners", label: "Referral partners", icon: Handshake, module: "partners" },
      { href: "/admin/reward-rules", label: "Reward rules", icon: BadgeIndianRupee, module: "partners" },
    ],
  },
  {
    title: "Insight",
    items: [
      { href: "/admin/reports", label: "Reports", icon: BarChart3, module: "reports" },
      { href: "/admin/documents", label: "Documents", icon: FolderOpen, module: "documents" },
      { href: "/admin/portal", label: "Client portal", icon: LifeBuoy, module: "portal" },
    ],
  },
  {
    title: "Website content",
    items: [
      { href: "/admin/services", label: "Services", icon: Sparkles, module: "website" },
      { href: "/admin/calculator", label: "Cost calculator", icon: Calculator, module: "website" },
      { href: "/admin/videos", label: "Video carousel", icon: Clapperboard, module: "website" },
      { href: "/admin/service-categories", label: "Service groups", icon: Folder, module: "website" },
      { href: "/admin/projects", label: "Portfolio", icon: Star, module: "website" },
      { href: "/admin/posts", label: "Blog posts", icon: Newspaper, module: "website" },
      { href: "/admin/post-categories", label: "Blog categories", icon: Tags, module: "website" },
      { href: "/admin/pages", label: "Pages", icon: Files, module: "website" },
    ],
  },
  {
    title: "Home page",
    items: [
      { href: "/admin/hero", label: "Hero slides", icon: FileText, module: "website" },
      { href: "/admin/stats", label: "Stats", icon: BarChart3, module: "website" },
      { href: "/admin/process", label: "Process steps", icon: Workflow, module: "website" },
      { href: "/admin/testimonials", label: "Testimonials", icon: MessageSquareQuote, module: "website" },
      { href: "/admin/client-logos", label: "Client logos", icon: Building2, module: "website" },
      { href: "/admin/faqs", label: "FAQs", icon: Star, module: "website" },
    ],
  },
  {
    title: "Site",
    items: [
      { href: "/admin/subscribers", label: "Subscribers", icon: Mail, module: "website" },
      { href: "/admin/team", label: "Team page", icon: Users, module: "website" },
      { href: "/admin/menus", label: "Navigation", icon: Route, module: "website" },
      { href: "/admin/media", label: "Media", icon: ImageIcon, module: "website" },
    ],
  },
  {
    title: "Administration",
    items: [
      { href: "/admin/integrations", label: "Integrations", icon: Plug, module: "integrations" },
      { href: "/admin/settings", label: "Settings & SEO", icon: Settings, module: "settings" },
      { href: "/admin/users", label: "Team access", icon: UserCog, module: "users" },
    ],
  },
];

export function Sidebar({ user }: { user: { name: string; email: string; role: Role } }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  // Only render what this role is allowed to reach.
  const groups = GROUPS.map((g) => ({ ...g, items: g.items.filter((i) => canView(user.role, i.module)) })).filter(
    (g) => g.items.length,
  );

  const isActive = (href: string) => {
    if (href === "/admin") return pathname === "/admin";
    // /admin/projects (portfolio) must not light up for /admin/client-projects
    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <>
      <div className="sticky top-0 z-40 flex items-center justify-between border-b border-navy-900/10 bg-navy-950 px-4 py-3 lg:hidden">
        <Image src="/brand/logo-mark-light.png" alt="Sahab India" width={512} height={666} className="h-8 w-auto" />
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-white hover:bg-white/10"
          aria-label={open ? "Close navigation" : "Open navigation"}
        >
          {open ? <X className="size-5" /> : <MenuIcon className="size-5" />}
        </button>
      </div>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex w-72 flex-col bg-navy-950 transition-transform duration-300 lg:sticky lg:top-0 lg:h-screen lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-6 py-5">
          <Link href="/admin" className="flex items-center gap-3">
            <Image src="/brand/logo-mark-light.png" alt="" width={512} height={666} className="h-8 w-auto" />
            <span className="flex flex-col leading-none">
              <span className="font-display text-base font-semibold tracking-wide text-gold-400">Sahab India</span>
              <span className="mt-1 text-[0.6rem] font-medium uppercase tracking-[0.28em] text-navy-300">
                Admin panel
              </span>
            </span>
          </Link>
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="rounded-lg p-1.5 text-white hover:bg-white/10 lg:hidden"
            aria-label="Close navigation"
          >
            <X className="size-5" />
          </button>
        </div>

        <nav className="scroll-slim flex-1 overflow-y-auto px-3 py-4" aria-label="Admin">
          {groups.map((group) => (
            <div key={group.title} className="mb-5">
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.18em] text-navy-400">
                {group.title}
              </p>
              <ul className="space-y-0.5">
                {group.items.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive(href)
                          ? "bg-gold-500/15 font-medium text-gold-300"
                          : "text-navy-200 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon className="size-4 shrink-0" aria-hidden />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="border-t border-white/10 p-4">
          <Link
            href="/"
            target="_blank"
            className="mb-3 flex items-center gap-2 rounded-lg px-3 py-2 text-xs text-navy-300 hover:bg-white/5 hover:text-gold-300"
          >
            <Globe className="size-4" aria-hidden />
            View live site
          </Link>

          <details className="group">
            <summary className="flex cursor-pointer list-none items-center gap-3 rounded-lg px-3 py-2 hover:bg-white/5">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-gold-500/20 text-sm font-semibold text-gold-300">
                {user.name.charAt(0).toUpperCase()}
              </span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium text-white">{user.name}</span>
                <span className="block truncate text-xs text-navy-400">{ROLE_LABELS[user.role]}</span>
              </span>
              <ChevronDown className="size-4 text-navy-400 transition-transform group-open:rotate-180" aria-hidden />
            </summary>
            <form action={logoutAction} className="mt-1 px-1">
              <button
                type="submit"
                className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-navy-200 hover:bg-red-500/10 hover:text-red-300"
              >
                <LogOut className="size-4" aria-hidden />
                Sign out
              </button>
            </form>
          </details>
        </div>
      </aside>

      {open ? (
        <div className="fixed inset-0 z-40 bg-navy-950/60 lg:hidden" onClick={() => setOpen(false)} aria-hidden />
      ) : null}
    </>
  );
}
