import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";
import { canView, type ModuleKey } from "@/lib/permissions";
import type { Role } from "@/generated/prisma/enums";

/**
 * Central guard for the admin panel.
 *
 * Every /admin route maps to a module, and the signed session cookie carries
 * the role. Doing it here means a new page is protected by default rather than
 * relying on each one remembering to call a guard.
 */
const ROUTE_MODULES: [prefix: string, module: ModuleKey][] = [
  ["/admin/leads", "leads"],
  ["/admin/enquiries", "leads"],
  ["/admin/clients", "clients"],
  ["/admin/quotations", "quotations"],
  ["/admin/client-projects", "projects"],
  ["/admin/tasks", "tasks"],
  ["/admin/finance", "finance"],
  ["/admin/renewals", "renewals"],
  ["/admin/campaigns", "campaigns"],
  ["/admin/media-contacts", "campaigns"],
  ["/admin/events", "events"],
  ["/admin/hr/payroll", "payroll"],
  ["/admin/hr", "team"],
  ["/admin/influencers", "influencers"],
  ["/admin/influencer-campaigns", "influencers"],
  ["/admin/partners", "partners"],
  ["/admin/reward-rules", "partners"],
  ["/admin/reports", "reports"],
  ["/admin/documents", "documents"],
  ["/admin/portal", "portal"],
  ["/admin/integrations", "integrations"],
  ["/admin/message-templates", "integrations"],
  ["/admin/print/invoice", "finance"],
  ["/admin/print/quotation", "quotations"],
  ["/admin/settings", "settings"],
  ["/admin/users", "users"],
];

function moduleFor(pathname: string): ModuleKey {
  if (pathname === "/admin") return "dashboard";
  for (const [prefix, module] of ROUTE_MODULES) {
    if (pathname === prefix || pathname.startsWith(`${prefix}/`)) return module;
  }
  // Everything else under /admin is website content management.
  return "website";
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin/login") return NextResponse.next();

  const token = request.cookies.get("sahab_admin")?.value;
  const loginUrl = new URL("/admin/login", request.url);

  if (!token) return NextResponse.redirect(loginUrl);

  try {
    const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.AUTH_SECRET));
    const role = payload.role as Role;

    if (!canView(role, moduleFor(pathname))) {
      const home = new URL("/admin", request.url);
      home.searchParams.set("denied", moduleFor(pathname));
      return NextResponse.redirect(home);
    }

    return NextResponse.next();
  } catch {
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/admin/:path*"],
};
