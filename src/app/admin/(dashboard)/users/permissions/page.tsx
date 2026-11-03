import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requirePermission } from "@/lib/auth";
import { PageHeader } from "@/components/admin/ui";
import { PermissionForm } from "@/components/admin/PermissionForm";
import {
  FIELD_KEYS,
  FIELD_LABELS,
  MODULE_KEYS,
  MODULE_LABELS,
  ROLE_LABELS,
  defaultAccess,
  defaultFieldVisible,
  type Access,
  type FieldKey,
  type ModuleKey,
} from "@/lib/permissions";
import type { Role } from "@/generated/prisma/enums";
import { cn } from "@/lib/utils";

const ROLES = Object.keys(ROLE_LABELS) as Role[];
const MODULE_OPTIONS: [Access, string][] = [
  ["none", "No access"],
  ["own", "Own only"],
  ["read", "View"],
  ["write", "Full"],
];
const FIELD_OPTIONS: [Access, string][] = [
  ["none", "Hidden"],
  ["read", "Shown"],
];
const label = (options: [Access, string][], v: Access) => options.find(([o]) => o === v)?.[1] ?? v;
const selectClass = "w-full min-w-[7.5rem] rounded-lg border border-navy-900/15 bg-white px-2 py-1.5 text-xs focus:border-gold-500 focus:outline-none";

type Row = { key: string; title: string; detail?: string; options: [Access, string][]; fallback: (role: Role) => Access };

const ROWS: { group: string; rows: Row[] }[] = [
  {
    group: "Modules",
    rows: MODULE_KEYS.map((m) => ({
      key: m,
      title: MODULE_LABELS[m],
      options: MODULE_OPTIONS,
      fallback: (role: Role) => defaultAccess(role, m as ModuleKey),
    })),
  },
  {
    group: "Sensitive fields",
    rows: FIELD_KEYS.map((f) => ({
      key: `field:${f}`,
      title: FIELD_LABELS[f].label,
      detail: FIELD_LABELS[f].detail,
      options: FIELD_OPTIONS,
      fallback: (role: Role) => (defaultFieldVisible(role, f as FieldKey) ? "read" : "none"),
    })),
  },
];

/**
 * Who can do what, editable. "By role" changes everyone in a role; "By person"
 * gives one person an exception on top of their role. "Own only" limits
 * projects, tasks and similar lists to records the person is assigned to.
 */
export default async function PermissionsPage({ searchParams }: { searchParams: Promise<{ tab?: string; user?: string }> }) {
  await requirePermission("users", "write");
  const { tab, user: userId } = await searchParams;
  const byPerson = tab === "people";

  const [rows, users] = await Promise.all([
    prisma.permissionOverride.findMany({ select: { subject: true, key: true, access: true } }),
    prisma.user.findMany({ where: { isActive: true }, select: { id: true, name: true, role: true, email: true }, orderBy: { name: "asc" } }),
  ]);
  const saved = new Map(rows.map((r) => [`${r.subject}|${r.key}`, r.access as Access]));
  const roleValue = (role: Role, row: Row) => saved.get(`role:${role}|${row.key}`) ?? row.fallback(role);
  const person = users.find((u) => u.id === userId) ?? null;

  return (
    <>
      <Link href="/admin/users" className="mb-5 inline-flex items-center gap-2 text-sm text-slate-500 hover:text-navy-900">
        <ArrowLeft className="size-4" aria-hidden /> Team access
      </Link>
      <PageHeader
        title="Permissions"
        description="Set what each role can reach, then give individual people exceptions. Gold cells differ from the standard setup. Super Admins always keep Team access and Settings."
      />

      <div className="mb-6 inline-flex rounded-xl border border-navy-900/10 bg-white p-1 text-sm">
        <Link href="/admin/users/permissions" className={cn("rounded-lg px-4 py-2 font-medium", !byPerson ? "bg-navy-900 text-white" : "text-navy-700 hover:bg-slate-50")}>
          By role
        </Link>
        <Link href="/admin/users/permissions?tab=people" className={cn("rounded-lg px-4 py-2 font-medium", byPerson ? "bg-navy-900 text-white" : "text-navy-700 hover:bg-slate-50")}>
          By person
        </Link>
      </div>

      {!byPerson ? (
        <PermissionForm>
          <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
            <div className="scroll-slim max-h-[70vh] overflow-auto">
              <table className="w-full text-left text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 text-xs text-slate-500">
                  <tr>
                    <th className="sticky left-0 z-20 bg-slate-50 px-4 py-3 font-medium uppercase tracking-wide">Area</th>
                    {ROLES.map((r) => (
                      <th key={r} className="px-2 py-3 font-medium">
                        {ROLE_LABELS[r]}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-navy-900/5">
                  {ROWS.map(({ group, rows: groupRows }) => [
                    <tr key={group} className="bg-navy-50/60">
                      <td colSpan={ROLES.length + 1} className="sticky left-0 px-4 py-2 text-xs font-semibold uppercase tracking-wide text-navy-700">
                        {group}
                      </td>
                    </tr>,
                    ...groupRows.map((row) => (
                      <tr key={row.key}>
                        <td className="sticky left-0 z-[1] bg-white px-4 py-2 align-top">
                          <span className="block font-medium text-navy-900">{row.title}</span>
                          {row.detail ? <span className="block max-w-[14rem] text-xs text-slate-500">{row.detail}</span> : null}
                        </td>
                        {ROLES.map((role) => {
                          const lockedCell = role === "SUPER_ADMIN" && (row.key === "users" || row.key === "settings");
                          const value = roleValue(role, row);
                          const differs = value !== row.fallback(role);
                          return (
                            <td key={role} className="px-2 py-2">
                              {lockedCell ? (
                                <span className="block px-2 py-1.5 text-xs text-slate-500">Full (fixed)</span>
                              ) : (
                                <select
                                  name={`p:role:${role}|${row.key}`}
                                  defaultValue={value}
                                  aria-label={`${row.title} for ${ROLE_LABELS[role]}`}
                                  className={cn(selectClass, differs && "border-gold-500 bg-gold-50 font-semibold")}
                                >
                                  {row.options.map(([v, l]) => (
                                    <option key={v} value={v}>
                                      {l}
                                      {v === row.fallback(role) ? " (standard)" : ""}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    )),
                  ])}
                </tbody>
              </table>
            </div>
          </div>
        </PermissionForm>
      ) : (
        <>
          <form className="mb-6 flex flex-wrap items-end gap-3">
            <input type="hidden" name="tab" value="people" />
            <label className="text-xs text-slate-500">
              Person
              <select name="user" defaultValue={person?.id ?? ""} className="mt-1 block min-w-[18rem] rounded-xl border border-navy-900/15 bg-white px-3 py-2.5 text-sm">
                <option value="">— Choose someone —</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} · {ROLE_LABELS[u.role]}
                  </option>
                ))}
              </select>
            </label>
            <button type="submit" className="rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800">
              Open
            </button>
          </form>

          {person ? (
            <PermissionForm key={person.id}>
              <p className="mb-4 text-sm text-slate-600">
                <span className="font-semibold text-navy-900">{person.name}</span> ({person.email}) is a{" "}
                <span className="font-semibold">{ROLE_LABELS[person.role]}</span>. Leave a row on “Role setting” to follow the
                role; pick anything else to make an exception for this person only.
              </p>
              <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
                <table className="w-full text-left text-sm">
                  <tbody className="divide-y divide-navy-900/5">
                    {ROWS.map(({ group, rows: groupRows }) => [
                      <tr key={group} className="bg-navy-50/60">
                        <td colSpan={2} className="px-4 py-2 text-xs font-semibold uppercase tracking-wide text-navy-700">
                          {group}
                        </td>
                      </tr>,
                      ...groupRows.map((row) => {
                        const own = saved.get(`user:${person.id}|${row.key}`);
                        const inherited = roleValue(person.role, row);
                        const lockedCell = person.role === "SUPER_ADMIN" && (row.key === "users" || row.key === "settings");
                        return (
                          <tr key={row.key}>
                            <td className="px-4 py-2.5">
                              <span className="block font-medium text-navy-900">{row.title}</span>
                              {row.detail ? <span className="block text-xs text-slate-500">{row.detail}</span> : null}
                            </td>
                            <td className="w-64 px-4 py-2.5">
                              {lockedCell ? (
                                <span className="text-xs text-slate-500">Full (fixed for Super Admins)</span>
                              ) : (
                                <select
                                  name={`p:user:${person.id}|${row.key}`}
                                  defaultValue={own ?? ""}
                                  aria-label={`${row.title} for ${person.name}`}
                                  className={cn(selectClass, own && "border-gold-500 bg-gold-50 font-semibold")}
                                >
                                  <option value="">Role setting ({label(row.options, inherited)})</option>
                                  {row.options.map(([v, l]) => (
                                    <option key={v} value={v}>
                                      {l}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </td>
                          </tr>
                        );
                      }),
                    ])}
                  </tbody>
                </table>
              </div>
            </PermissionForm>
          ) : (
            <p className="text-sm text-slate-500">Choose a person to see and change their exceptions.</p>
          )}
        </>
      )}
    </>
  );
}
