import "server-only";
import { prisma } from "@/lib/prisma";
import { applyOverrides, type Access, type Overrides } from "@/lib/permissions";

/**
 * Loads the saved permission overrides into the sync checks in permissions.ts.
 *
 * Every page guard and server action already awaits the session, which awaits
 * this, so the checks that follow it see current overrides without each call
 * site going async. Results are kept for a few seconds; a save clears them in
 * this process at once, and the proxy, which runs in its own module graph,
 * picks the change up within that window.
 */
const MAX_AGE_MS = 10_000;
const ACCESS = new Set<Access>(["none", "own", "read", "write"]);

let loadedAt = 0;
let inflight: Promise<void> | null = null;

export async function ensurePermissions() {
  if (Date.now() - loadedAt < MAX_AGE_MS) return;
  inflight ??= (async () => {
    try {
      const rows = await prisma.permissionOverride.findMany({ select: { subject: true, key: true, access: true } });
      const next: Overrides = { role: new Map(), user: new Map() };
      for (const row of rows) {
        if (!ACCESS.has(row.access as Access)) continue;
        const [kind, id] = row.subject.split(":");
        if (kind === "role") next.role.set(`${id}|${row.key}`, row.access as Access);
        else if (kind === "user") next.user.set(`${id}|${row.key}`, row.access as Access);
      }
      applyOverrides(next);
      loadedAt = Date.now();
    } catch (error) {
      // Keep whatever was loaded last rather than failing every page; with
      // nothing loaded yet the code defaults apply.
      console.error("[permissions] could not load overrides", error);
    } finally {
      inflight = null;
    }
  })();
  await inflight;
}

export function invalidatePermissions() {
  loadedAt = 0;
}
