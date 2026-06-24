import type { VolunteerRole } from "@/lib/types";

/** Volunteer interests restricted to adults (18+). */
export const ADULT_ONLY_VOLUNTEER_ROLES: VolunteerRole[] = [
  "intake_representative",
  "trapper",
  "trap_loaner",
  "grant_writing",
];

export function calculateAge(birthday: string, asOf = new Date()): number | null {
  if (!birthday) return null;
  const born = new Date(`${birthday}T12:00:00`);
  if (Number.isNaN(born.getTime())) return null;
  const today = new Date(asOf);
  today.setHours(12, 0, 0, 0);
  let age = today.getFullYear() - born.getFullYear();
  const monthDiff = today.getMonth() - born.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < born.getDate())) {
    age -= 1;
  }
  return age;
}

export function isAdult(birthday: string): boolean {
  const age = calculateAge(birthday);
  return age !== null && age >= 18;
}

export function isUnder18(birthday: string): boolean {
  const age = calculateAge(birthday);
  return age !== null && age < 18;
}

export function filterRolesForAge(
  roles: VolunteerRole[],
  birthday: string | null | undefined
): VolunteerRole[] {
  if (!birthday || isAdult(birthday)) return roles;
  return roles.filter((role) => !ADULT_ONLY_VOLUNTEER_ROLES.includes(role));
}

export function hasRestrictedRoleForMinor(roles: VolunteerRole[]): VolunteerRole[] {
  return roles.filter((role) => ADULT_ONLY_VOLUNTEER_ROLES.includes(role));
}
