"use client";

import { useActionState } from "react";
import { Save } from "lucide-react";
import { savePermissions, type PermissionState } from "@/app/admin/actions/permissions";
import { PendingButton } from "@/components/admin/PendingButton";

/** Wraps a server-rendered grid of permission selects with save and its result. */
export function PermissionForm({ children }: { children: React.ReactNode }) {
  const [state, action] = useActionState<PermissionState, FormData>(savePermissions, {});
  return (
    <form action={action}>
      {children}
      <div className="sticky bottom-0 z-10 -mx-4 mt-6 flex flex-wrap items-center justify-end gap-3 border-t border-navy-900/10 bg-white/95 px-4 py-4 backdrop-blur sm:-mx-6 sm:px-6">
        {state.error ? <p className="mr-auto text-sm text-red-600">{state.error}</p> : null}
        {state.message ? <p className="mr-auto text-sm text-emerald-700">{state.message}</p> : null}
        <PendingButton
          icon={<Save className="size-4" aria-hidden />}
          pendingLabel="Saving…"
          className="inline-flex items-center gap-2 rounded-xl bg-navy-900 px-5 py-2.5 text-sm font-semibold text-white hover:bg-navy-800"
        >
          Save permissions
        </PendingButton>
      </div>
    </form>
  );
}
