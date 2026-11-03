import type { Role } from "@/generated/prisma/enums";

/**
 * Who can reach what, inside the one admin panel.
 *
 * The roles mirror section 3 of the project scope document. Every module the
 * panel exposes is listed here once; the sidebar, the page guards and the
 * server actions all read from this single matrix.
 *
 * The matrix below is only the starting point. A Super Admin can override any
 * cell for a whole role, or for one person, from Team access → Permissions;
 * those overrides live in the database and are applied here by
 * `applyOverrides`. A person's own override beats their role's, which beats
 * the default.
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
  | "placements"
  | "influencers"
  | "partners"
  | "reports"
  | "documents"
  | "portal"
  | "integrations"
  | "website"
  | "settings"
  | "users";

/**
 * Sensitive fields that can be shown or hidden independently of the module
 * they sit in — a team lead can work a client's project without seeing the
 * client's phone number.
 */
export type FieldKey = "clients.contacts" | "clients.billing" | "leads.contact" | "projects.pricing";

export const FIELD_LABELS: Record<FieldKey, { label: string; detail: string }> = {
  "clients.contacts": { label: "Client contact details", detail: "Contact names, emails and phone numbers on clients." },
  "clients.billing": { label: "Client billing details", detail: "GSTIN, PAN and address on clients." },
  "leads.contact": { label: "Lead contact details", detail: "Email and phone of leads and enquiries." },
  "projects.pricing": { label: "Project pricing", detail: "Project, subscription and maintenance cost, GST and budget." },
};

/** Who sees each sensitive field before any override. */
const FIELD_DEFAULTS: Record<FieldKey, Role[]> = {
  "clients.contacts": ["SUPER_ADMIN", "DIRECTOR", "SALES", "PROJECT_MANAGER", "FINANCE"],
  "clients.billing": ["SUPER_ADMIN", "DIRECTOR", "SALES", "PROJECT_MANAGER", "FINANCE"],
  "leads.contact": ["SUPER_ADMIN", "DIRECTOR", "SALES", "PROJECT_MANAGER"],
  "projects.pricing": ["SUPER_ADMIN", "DIRECTOR", "SALES", "PROJECT_MANAGER", "FINANCE"],
};

/**
 * Anyone a check is made for: a bare role (role defaults and role overrides
 * only), or a signed-in person, whose own overrides then apply as well.
 */
export type Subject = Role | { id?: string | null; role: Role };

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
  HR: "Employees, attendance, leave, payroll, letters and placements.",
  PARTNER_MANAGER: "Influencers, referral partners, campaigns and events.",
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
    finance: W, renewals: W, campaigns: W, events: W, team: W, payroll: W, placements: W,
    influencers: W, partners: W, reports: W, documents: W, portal: W,
    integrations: W, website: W, settings: W, users: W,
  },
  DIRECTOR: {
    dashboard: W, leads: W, chats: W, clients: W, quotations: W, projects: W, tasks: W,
    finance: W, renewals: W, campaigns: W, events: W, team: W, payroll: R, placements: W,
    influencers: R, partners: R, reports: W, documents: W, portal: W,
    integrations: R, website: R, settings: R, users: N,
  },
  SALES: {
    dashboard: R, leads: W, chats: W, clients: W, quotations: W, projects: R, tasks: N,
    finance: N, renewals: R, campaigns: N, events: N, team: N, payroll: N, placements: N,
    influencers: N, partners: R, reports: R, documents: R, portal: N,
    integrations: N, website: N, settings: N, users: N,
  },
  PROJECT_MANAGER: {
    dashboard: R, leads: R, chats: W, clients: W, quotations: R, projects: W, tasks: W,
    finance: R, renewals: W, campaigns: W, events: W, team: R, payroll: N, placements: N,
    influencers: N, partners: N, reports: R, documents: W, portal: W,
    integrations: N, website: N, settings: N, users: N,
  },
  TEAM_LEAD: {
    dashboard: R, leads: N, chats: N, clients: R, quotations: N, projects: O, tasks: W,
    finance: N, renewals: N, campaigns: W, events: R, team: R, payroll: N, placements: N,
    influencers: N, partners: N, reports: R, documents: R, portal: N,
    integrations: N, website: N, settings: N, users: N,
  },
  TEAM_MEMBER: {
    dashboard: R, leads: N, chats: N, clients: N, quotations: N, projects: O, tasks: O,
    finance: N, renewals: N, campaigns: O, events: N, team: O, payroll: O, placements: N,
    influencers: N, partners: N, reports: N, documents: R, portal: N,
    integrations: N, website: N, settings: N, users: N,
  },
  FINANCE: {
    dashboard: R, leads: N, chats: N, clients: R, quotations: R, projects: R, tasks: N,
    finance: W, renewals: W, campaigns: N, events: N, team: R, payroll: W, placements: R,
    influencers: N, partners: R, reports: W, documents: R, portal: N,
    integrations: N, website: N, settings: N, users: N,
  },
  HR: {
    dashboard: R, leads: N, chats: N, clients: N, quotations: N, projects: N, tasks: N,
    finance: N, renewals: N, campaigns: N, events: N, team: W, payroll: W, placements: W,
    influencers: N, partners: N, reports: R, documents: N, portal: N,
    integrations: N, website: N, settings: N, users: N,
  },
  PARTNER_MANAGER: {
    dashboard: R, leads: N, chats: N, clients: R, quotations: N, projects: N, tasks: N,
    finance: N, renewals: N, campaigns: W, events: W, team: N, payroll: N, placements: R,
    influencers: W, partners: W, reports: R, documents: R, portal: N,
    integrations: N, website: N, settings: N, users: N,
  },
  EDITOR: {
    dashboard: R, leads: N, chats: N, clients: N, quotations: N, projects: N, tasks: N,
    finance: N, renewals: N, campaigns: N, events: N, team: N, payroll: N, placements: N,
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
  placements: "Placements",
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

// ---------------------------------------------------------------- overrides

/** Keys are `ROLE|key` and `userId|key`; field keys are stored as `field:<key>`. */
export type Overrides = { role: Map<string, Access>; user: Map<string, Access> };

let overrides: Overrides | null = null;

/** Installed on the server by the permission store; the browser never has them. */
export function applyOverrides(next: Overrides) {
  overrides = next;
}

function parts(subject: Subject) {
  return typeof subject === "string" ? { role: subject, id: null } : { role: subject.role, id: subject.id ?? null };
}

/**
 * A Super Admin always keeps Team access and Settings, whatever is saved, so
 * the panel can never be locked out of its own permission screen.
 */
function locked(role: Role, key: string) {
  return role === "SUPER_ADMIN" && (key === "users" || key === "settings");
}

function resolve(subject: Subject, key: string, fallback: Access): Access {
  const { role, id } = parts(subject);
  if (locked(role, key) || !overrides) return fallback;
  return (id && overrides.user.get(`${id}|${key}`)) || overrides.role.get(`${role}|${key}`) || fallback;
}

/** The code default, before any override. */
export function defaultAccess(role: Role, module: ModuleKey): Access {
  return PERMISSIONS[role]?.[module] ?? "none";
}

export function defaultFieldVisible(role: Role, field: FieldKey) {
  return FIELD_DEFAULTS[field].includes(role);
}

export function accessTo(subject: Subject, module: ModuleKey): Access {
  return resolve(subject, module, defaultAccess(parts(subject).role, module));
}

/** True when the subject reaches `module` at least at `level`. */
export function can(subject: Subject, module: ModuleKey, level: Access = "read"): boolean {
  return ORDER[accessTo(subject, module)] >= ORDER[level];
}

/** True when the subject may open the module at all, even if only its own records. */
export function canView(subject: Subject, module: ModuleKey): boolean {
  return accessTo(subject, module) !== "none";
}

/** True when the subject only sees records assigned to them. */
export function isOwnScoped(subject: Subject, module: ModuleKey): boolean {
  return accessTo(subject, module) === "own";
}

export function canEdit(subject: Subject, module: ModuleKey): boolean {
  return accessTo(subject, module) === "write";
}

/** Whether a sensitive field is shown. Stored as read (shown) or none (hidden). */
export function canSee(subject: Subject, field: FieldKey): boolean {
  const fallback: Access = defaultFieldVisible(parts(subject).role, field) ? "read" : "none";
  return resolve(subject, `field:${field}`, fallback) !== "none";
}

export const MODULE_KEYS = Object.keys(MODULE_LABELS) as ModuleKey[];
export const FIELD_KEYS = Object.keys(FIELD_LABELS) as FieldKey[];
