"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { logActivity, requirePermission } from "@/lib/auth";
import { invalidatePermissions } from "@/lib/permission-store";
import {
  FIELD_KEYS,
  MODULE_KEYS,
  defaultAccess,
  defaultFieldVisible,
  type Access,
  type FieldKey,
  type ModuleKey,
} from "@/lib/permissions";
import type { Role } from "@/generated/prisma/enums";

export type PermissionState = { error?: string; message?: string };

const ROLES: Role[] = ["SUPER_ADMIN", "DIRECTOR", "SALES", "PROJECT_MANAGER", "TEAM_LEAD", "TEAM_MEMBER", "FINANCE", "HR", "PARTNER_MANAGER", "EDITOR"];
const MODULE_ACCESS = new Set(["none", "own", "read", "write"]);
const FIELD_ACCESS = new Set(["none", "read"]);

/** Cells the screen posts as `p:<subject>|<key>`; parsed and checked here. */
function parse(name: string) {
  const [subject, key] = name.slice(2).split("|");
  const [kind, id] = (subject ?? "").split(":");
  const field = key?.startsWith("field:") ? (key.slice(6) as FieldKey) : null;
  const known = field ? FIELD_KEYS.includes(field) : MODULE_KEYS.includes(key as ModuleKey);
  if (!known || (kind !== "role" && kind !== "user") || !id) return null;
  return { subject: `${kind}:${id}`, kind, id, key, field };
}

/**
 * Saves one screen's worth of cells.
 *
 * A role cell set back to its code default, or a person's cell set to "role
 * setting", deletes the override rather than storing a copy of the default —
 * so a later change to the defaults still reaches everyone who never had it
 * changed for them.
 */
export async function savePermissions(_prev: PermissionState, form: FormData): Promise<PermissionState> {
  const session = await requirePermission("users", "write");
  let changed = 0;

  for (const [name, raw] of form.entries()) {
    if (!name.startsWith("p:")) continue;
    const cell = parse(name);
    if (!cell) continue;
    const value = String(raw);

    // Super Admins always keep Team access and Settings; see permissions.ts.
    if (cell.kind === "role" && cell.id === "SUPER_ADMIN" && (cell.key === "users" || cell.key === "settings")) continue;

    let inherit = value === "";
    if (cell.kind === "role") {
      const role = cell.id as Role;
      if (!ROLES.includes(role)) continue;
      const fallback: Access = cell.field
        ? defaultFieldVisible(role, cell.field) ? "read" : "none"
        : defaultAccess(role, cell.key as ModuleKey);
      inherit ||= value === fallback;
    }
    if (!inherit && !(cell.field ? FIELD_ACCESS : MODULE_ACCESS).has(value)) continue;

    const where = { subject_key: { subject: cell.subject, key: cell.key } };
    const existing = await prisma.permissionOverride.findUnique({ where, select: { access: true } });

    if (inherit) {
      if (existing) {
        await prisma.permissionOverride.delete({ where });
        changed += 1;
      }
    } else if (existing?.access !== value) {
      await prisma.permissionOverride.upsert({
        where,
        update: { access: value, updatedById: session.id },
        create: { subject: cell.subject, key: cell.key, access: value, updatedById: session.id },
      });
      changed += 1;
    }
  }

  invalidatePermissions();
  await logActivity(session.id, "update", "Permissions", undefined, `${changed} permission cells changed`);
  revalidatePath("/admin", "layout");
  return { message: changed ? `Saved — ${changed} change${changed === 1 ? "" : "s"}. People see them on their next page load.` : "Nothing changed." };
}
