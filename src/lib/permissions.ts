import type { Role } from "@/generated/prisma/enums";

/**
 * Who can reach what, inside the one admin panel.
 *
 * The roles mirror section 3 of the project scope document. Every module the
 * panel exposes is listed here once; the sidebar, the page guards and the
 * server actions all read from this single matrix, so granting a team member
 * access is a one-line change rather than a hunt through the codebase.
 */

export type ModuleKey =
  | "dashboard"
  | "leads"
  | "chats"
  | "clients"
  | "quotations"
  | "projects"
  | "tasks"
  | "finance"
  | "renewals"
  | "campaigns"
  | "events"
  | "team"
  | "payroll"
  | "influencers"
  | "partners"
  | "reports"
  | "documents"
  | "portal"
  | "integrations"
  | "website"
  | "settings"
  | "users";

/** "own" limits a user to records assigned to them. */
export type Access = "none" | "own" | "read" | "write";

const ORDER: Record<Access, number> = { none: 0, own: 1, read: 2, write: 3 };

export const ROLE_LABELS: Record<Role, string> = {
  SUPER_ADMIN: "Super Admin / CEO",
  DIRECTOR: "Director / Management",
  SALES: "Sales / Business Development",
  PROJECT_MANAGER: "Project / Account Manager",
  TEAM_LEAD: "Service Team Lead",
  TEAM_MEMBER: "Team Member",
  FINANCE: "Finance / Accounts",
  HR: "HR / Admin",
  PARTNER_MANAGER: "Influencer / Partner Manager",
  EDITOR: "Website Editor",
};

export const ROLE_DESCRIPTIONS: Record<Role, string> = {
  SUPER_ADMIN: "Everything, including settings and admin users.",
  DIRECTOR: "Clients, projects, delivery and reports. Cannot manage admin users.",
  SALES: "Leads, follow-ups, quotations and client onboarding.",
  PROJECT_MANAGER: "Client accounts, project scopes, milestones, tasks and team allocation.",
  TEAM_LEAD: "Assigned projects and task review across the team.",
  TEAM_MEMBER: "Only the tasks assigned to them.",
  FINANCE: "Read access to clients, quotations and projects for billing.",
  HR: "People administration. Employee modules arrive in a later phase.",
  PARTNER_MANAGER: "Influencers, partners and campaigns. Arrives in a later phase.",
  EDITOR: "Website content only — services, portfolio, blog and pages.",
};

const W: Access = "write";
const R: Access = "read";
const O: Access = "own";
const N: Access = "none";

/**
 * role → module → access
 *
 * Read across a row to see exactly what a role can reach. Columns follow the
 * order of the scope document's module list.
 */
export const PERMISSIONS: Record<Role, Record<ModuleKey, Access>> = {
  SUPER_ADMIN: {
    dashboard: W, leads: W, chats: W, clients: W, quotations: W, projects: W, tasks: W,
    finance: W, renewals: W, campaigns: W, events: W, team: W, payroll: W,
    influencers: W, partners: W, reports: W, documents: W, portal: W,
    integrations: W, website: W, settings: W, users: W,
  },
  DIRECTOR: {
    dashboard: W, leads: W, chats: W, clients: W, quotations: W, projects: W, tasks: W,
    finance: W, renewals: W, campaigns: W, events: W, team: W, payroll: R,
    influencers: R, partners: R, reports: W, documents: W, portal: W,
    integrations: R, website: R, settings: R, users: N,
  },
  SALES: {
    dashboard: R, leads: W, chats: W, clients: W, quotations: W, projects: R, tasks: N,
    finance: N, renewals: R, campaigns: N, events: N, team: N, payroll: N,
    influencers: N, partners: R, reports: R, documents: R, portal: N,
    integrations: N, website: N, settings: N, users: N,
  },
  PROJECT_MANAGER: {
    dashboard: R, leads: R, chats: W, clients: W, quotations: R, projects: W, tasks: W,
    finance: R, renewals: W, campaigns: W, events: W, team: R, payroll: N,
    influencers: N, partners: N, reports: R, documents: W, portal: W,
    integrations: N, website: N, settings: N, users: N,
  },
  TEAM_LEAD: {
    dashboard: R, leads: N, chats: N, clients: R, quotations: N, projects: R, tasks: W,
    finance: N, renewals: N, campaigns: W, events: R, team: R, payroll: N,
    influencers: N, partners: N, reports: R, documents: R, portal: N,
    integrations: N, website: N, settings: N, users: N,
  },
  TEAM_MEMBER: {
    dashboard: R, leads: N, chats: N, clients: N, quotations: N, projects: O, tasks: O,
    finance: N, renewals: N, campaigns: O, events: N, team: O, payroll: O,
    influencers: N, partners: N, reports: N, documents: R, portal: N,
    integrations: N, website: N, settings: N, users: N,
  },
  FINANCE: {
    dashboard: R, leads: N, chats: N, clients: R, quotations: R, projects: R, tasks: N,
    finance: W, renewals: W, campaigns: N, events: N, team: R, payroll: W,
    influencers: N, partners: R, reports: W, documents: R, portal: N,
    integrations: N, website: N, settings: N, users: N,
  },
  HR: {
    dashboard: R, leads: N, chats: N, clients: N, quotations: N, projects: N, tasks: N,
    finance: N, renewals: N, campaigns: N, events: N, team: W, payroll: W,
    influencers: N, partners: N, reports: R, documents: N, portal: N,
    integrations: N, website: N, settings: N, users: N,
  },
  PARTNER_MANAGER: {
    dashboard: R, leads: N, chats: N, clients: R, quotations: N, projects: N, tasks: N,
    finance: N, renewals: N, campaigns: W, events: W, team: N, payroll: N,
    influencers: W, partners: W, reports: R, documents: R, portal: N,
    integrations: N, website: N, settings: N, users: N,
  },
  EDITOR: {
    dashboard: R, leads: N, chats: N, clients: N, quotations: N, projects: N, tasks: N,
    finance: N, renewals: N, campaigns: N, events: N, team: N, payroll: N,
    influencers: N, partners: N, reports: N, documents: N, portal: N,
    integrations: N, website: W, settings: N, users: N,
  },
};

/** Human labels for each module, used in the sidebar and access screens. */
export const MODULE_LABELS: Record<ModuleKey, string> = {
  dashboard: "Dashboard",
  leads: "Leads",
  chats: "Live chat",
  clients: "Clients",
  quotations: "Quotations",
  projects: "Projects",
  tasks: "Tasks",
  finance: "Finance",
  renewals: "Renewals",
  campaigns: "Campaigns",
  events: "Events",
  team: "Team & HR",
  payroll: "Payroll",
  influencers: "Influencers",
  partners: "Partners",
  reports: "Reports",
  documents: "Documents",
  portal: "Client portal",
  integrations: "Integrations",
  website: "Website",
  settings: "Settings",
  users: "Team access",
};

export function accessTo(role: Role, module: ModuleKey): Access {
  return PERMISSIONS[role]?.[module] ?? "none";
}

/** True when the role reaches `module` at least at `level`. */
export function can(role: Role, module: ModuleKey, level: Access = "read"): boolean {
  return ORDER[accessTo(role, module)] >= ORDER[level];
}

/** True when the role may open the module at all, even if only its own records. */
export function canView(role: Role, module: ModuleKey): boolean {
  return accessTo(role, module) !== "none";
}

/** True when the role only sees records assigned to them. */
export function isOwnScoped(role: Role, module: ModuleKey): boolean {
  return accessTo(role, module) === "own";
}

export function canEdit(role: Role, module: ModuleKey): boolean {
  return accessTo(role, module) === "write";
}
