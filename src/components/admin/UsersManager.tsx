"use client";

import { useActionState, useEffect, useState, useTransition } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { deleteUser, saveUser, type ActionState } from "@/app/admin/actions/content";
import { Alert, Badge, Card, FieldWrap, SubmitButton, Toggle, inputClass } from "@/components/admin/ui";
import { formatDate } from "@/lib/utils";
import { PERMISSIONS, ROLE_DESCRIPTIONS, ROLE_LABELS } from "@/lib/permissions";
import type { Role } from "@/generated/prisma/enums";

type UserRow = {
  id: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
};

const ROLES = (Object.keys(PERMISSIONS) as Role[]).map((value) => ({
  value,
  label: ROLE_LABELS[value],
  description: ROLE_DESCRIPTIONS[value],
}));

/** Modules this role can open, for the summary shown beside the form. */
function modulesFor(role: Role) {
  return Object.entries(PERMISSIONS[role])
    .filter(([, access]) => access !== "none")
    .map(([module, access]) => ({ module, access }));
}

export function UsersManager({ users, currentUserId }: { users: UserRow[]; currentUserId: string }) {
  const [editing, setEditing] = useState<UserRow | null>(null);
  const [creating, setCreating] = useState(false);
  const [notice, setNotice] = useState("");
  const [, startTransition] = useTransition();

  return (
    <div className="grid gap-6 lg:grid-cols-5">
      <div className="lg:col-span-3">
        {notice ? (
          <div className="mb-4">
            <Alert tone="success">{notice}</Alert>
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-navy-900/10 bg-white shadow-sm">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-navy-900/10 bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-5 py-3 font-medium">User</th>
                <th className="px-5 py-3 font-medium">Role</th>
                <th className="px-5 py-3 font-medium">Last sign-in</th>
                <th className="px-5 py-3 text-right font-medium">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-900/5">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/70">
                  <td className="px-5 py-3.5">
                    <p className="font-medium text-navy-900">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <div className="flex flex-wrap gap-1">
                      <Badge tone="neutral">{ROLE_LABELS[user.role as Role]}</Badge>
                      {!user.isActive ? <Badge tone="muted">disabled</Badge> : null}
                    </div>
                  </td>
                  <td className="px-5 py-3.5 text-xs text-slate-500">
                    {user.lastLoginAt ? formatDate(user.lastLoginAt, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" }) : "Never"}
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <div className="inline-flex gap-1">
                      <button
                        type="button"
                        onClick={() => {
                          setCreating(false);
                          setEditing(user);
                        }}
                        className="rounded-lg p-2 text-slate-500 hover:bg-navy-50 hover:text-navy-900"
                        aria-label={`Edit ${user.name}`}
                      >
                        <Pencil className="size-4" />
                      </button>
                      {user.id !== currentUserId ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm(`Remove ${user.name}?`)) {
                              startTransition(() => void deleteUser(user.id));
                              setNotice("User removed.");
                            }
                          }}
                          className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600"
                          aria-label={`Delete ${user.name}`}
                        >
                          <Trash2 className="size-4" />
                        </button>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {!creating && !editing ? (
          <button
            type="button"
            onClick={() => setCreating(true)}
            className="mt-4 inline-flex items-center gap-2 rounded-xl bg-navy-900 px-4 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
          >
            <Plus className="size-4" aria-hidden /> Add team member
          </button>
        ) : null}
      </div>

      <div className="lg:col-span-2">
        {creating || editing ? (
          <UserForm
            key={editing?.id ?? "new"}
            user={editing}
            onDone={(message) => {
              setNotice(message);
              setEditing(null);
              setCreating(false);
            }}
            onCancel={() => {
              setEditing(null);
              setCreating(false);
            }}
          />
        ) : (
          <Card title="What each role can do">
            <ul className="space-y-3 text-sm">
              {ROLES.map((r) => (
                <li key={r.value}>
                  <span className="font-medium text-navy-900">{r.label}</span>
                  <span className="mt-0.5 block text-xs text-slate-500">{r.description}</span>
                </li>
              ))}
            </ul>
          </Card>
        )}
      </div>
    </div>
  );
}

function UserForm({
  user,
  onDone,
  onCancel,
}: {
  user: UserRow | null;
  onDone: (message: string) => void;
  onCancel: () => void;
}) {
  const [state, action] = useActionState<ActionState, FormData>(saveUser, {});
  const [role, setRole] = useState<Role>((user?.role as Role) ?? "TEAM_MEMBER");

  useEffect(() => {
    if (state.ok && state.message) onDone(state.message);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [state]);

  return (
    <Card title={user ? "Edit team member" : "Add team member"}>
      <form action={action} className="space-y-5">
        {user ? <input type="hidden" name="id" value={user.id} /> : null}
        {state.error ? <Alert tone="error">{state.error}</Alert> : null}

        <FieldWrap label="Full name" htmlFor="name" required>
          <input id="name" name="name" required defaultValue={user?.name} className={inputClass} />
        </FieldWrap>

        <FieldWrap label="Email" htmlFor="email" required>
          <input id="email" name="email" type="email" required defaultValue={user?.email} className={inputClass} />
        </FieldWrap>

        <FieldWrap
          label="Password"
          htmlFor="password"
          required={!user}
          help={user ? "Leave blank to keep the current password." : "At least 8 characters."}
        >
          <input id="password" name="password" type="password" minLength={8} required={!user} className={inputClass} />
        </FieldWrap>

        <FieldWrap label="Role" htmlFor="role">
          <select
            id="role"
            name="role"
            defaultValue={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className={inputClass}
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
        </FieldWrap>

        <div className="rounded-xl border border-navy-900/10 bg-slate-50 p-4">
          <p className="text-sm text-navy-800">{ROLE_DESCRIPTIONS[role]}</p>
          <p className="mt-3 text-xs font-semibold uppercase tracking-wide text-slate-500">Can open</p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {modulesFor(role).map(({ module, access }) => (
              <li
                key={module}
                className="rounded-full bg-white px-2.5 py-1 text-[11px] font-medium text-navy-700 ring-1 ring-navy-900/10"
              >
                {module}
                <span className="ml-1 text-slate-400">
                  {access === "write" ? "edit" : access === "own" ? "own only" : "view"}
                </span>
              </li>
            ))}
          </ul>
        </div>

        <Toggle name="isActive" label="Account is active" defaultChecked={user?.isActive ?? true} />

        <div className="flex gap-3 border-t border-navy-900/10 pt-5">
          <SubmitButton>{user ? "Update user" : "Create user"}</SubmitButton>
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-navy-900/15 px-4 py-2.5 text-sm font-medium text-navy-800 hover:bg-slate-50"
          >
            Cancel
          </button>
        </div>
      </form>
    </Card>
  );
}
