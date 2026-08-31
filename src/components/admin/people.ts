import { ROLE_LABELS } from "@/lib/permissions";
import type { Role } from "@/generated/prisma/enums";

/**
 * Shape every "pick a team member" dropdown in the panel takes.
 *
 * Two people can easily share a first name, so the role travels with the name
 * and is shown in brackets — that is what makes the option selectable with
 * confidence rather than a guess.
 */
export type Person = { id: string; name: string; role?: Role | null };

/** Prisma select for a user feeding one of those dropdowns. */
export const PERSON_SELECT = { id: true, name: true, role: true } as const;

export function personLabel(person: Person) {
  return person.role ? `${person.name} (${ROLE_LABELS[person.role]})` : person.name;
}
