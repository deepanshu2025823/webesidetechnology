/**
 * Panel activity: how long each person actively used the admin panel per day.
 *
 * Days run on India time whatever the server's clock says, so a day's row is
 * keyed by midnight IST stored as UTC.
 */

const IST_OFFSET_MS = 330 * 60_000;

/** Hours a working day is expected to show; ACTIVITY_TARGET_HOURS overrides. */
export const TARGET_MINUTES = Math.round((Number(process.env.ACTIVITY_TARGET_HOURS) || 8) * 60);

/** Midnight IST of the day `at` falls on, as a UTC Date. */
export function istDay(at = new Date()) {
  const shifted = new Date(at.getTime() + IST_OFFSET_MS);
  shifted.setUTCHours(0, 0, 0, 0);
  return new Date(shifted.getTime() - IST_OFFSET_MS);
}

export function addDays(day: Date, n: number) {
  return new Date(day.getTime() + n * 86_400_000);
}

/** Sunday in IST. Not a working day, so never flagged as short. */
export function isSunday(day: Date) {
  return new Date(day.getTime() + IST_OFFSET_MS).getUTCDay() === 0;
}

/** YYYY-MM-DD of an IST day key. */
export function dayKey(day: Date) {
  return new Date(day.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

export function parseDayKey(key: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(key)) return null;
  const d = new Date(`${key}T00:00:00Z`);
  return Number.isNaN(d.getTime()) ? null : new Date(d.getTime() - IST_OFFSET_MS);
}

export function hours(minutes: number) {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? `${h}h ${String(m).padStart(2, "0")}m` : `${m}m`;
}

export function istTime(at: Date | null | undefined) {
  if (!at) return "—";
  return at.toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });
}
