import type { VolunteerRole } from "@/lib/types";

/** Roles volunteers under 18 may select on public signup. */
export const MINOR_SIGNUP_VOLUNTEER_ROLES: VolunteerRole[] = [
  "photographer",
  "videographer",
  "social_media",
  "crafter",
  "community_outreach",
];

/** Admin-facing label for minors — not selectable on public signup. */
export const ADMIN_ONLY_VOLUNTEER_ROLES: VolunteerRole[] = ["youth_volunteer"];

/** @deprecated Use isRoleAllowedOnSignup — adult-only interests for profile expansion. */
export const ADULT_ONLY_VOLUNTEER_ROLES: VolunteerRole[] = [
  "intake_representative",
  "trapper",
  "trap_loaner",
  "transporter",
  "recovery",
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

export function isRoleAllowedOnSignup(
  role: VolunteerRole,
  birthday: string | null | undefined
): boolean {
  if (ADMIN_ONLY_VOLUNTEER_ROLES.includes(role)) return false;
  if (!birthday || isAdult(birthday)) return true;
  return MINOR_SIGNUP_VOLUNTEER_ROLES.includes(role);
}

export function filterSignupRolesForAge(
  roles: VolunteerRole[],
  birthday: string | null | undefined
): VolunteerRole[] {
  return roles.filter((role) => isRoleAllowedOnSignup(role, birthday));
}

export function invalidRolesForMinorSignup(roles: VolunteerRole[]): VolunteerRole[] {
  return roles.filter((role) => !MINOR_SIGNUP_VOLUNTEER_ROLES.includes(role));
}

/** @deprecated Use invalidRolesForMinorSignup */
export function hasRestrictedRoleForMinor(roles: VolunteerRole[]): VolunteerRole[] {
  return invalidRolesForMinorSignup(roles);
}

/** @deprecated Use filterSignupRolesForAge */
export function filterRolesForAge(
  roles: VolunteerRole[],
  birthday: string | null | undefined
): VolunteerRole[] {
  return filterSignupRolesForAge(roles, birthday);
}

export function isMinorVolunteer(birthday: string | null | undefined): boolean {
  return Boolean(birthday && isUnder18(birthday));
}

export function hasRestrictedRoleForMinorProfileExpansion(
  roles: VolunteerRole[]
): VolunteerRole[] {
  return roles.filter((role) => ADULT_ONLY_VOLUNTEER_ROLES.includes(role));
}
