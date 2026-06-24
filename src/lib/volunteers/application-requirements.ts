import type { Profile, UserRole, VolunteerApplication } from "@/lib/types";

/** Platform roles that do not require a volunteer application on file. */
export const STAFF_ROLES_EXEMPT_FROM_APPLICATION: UserRole[] = [
  "admin",
  "inquiry_team",
  "trap_team_lead",
  "clinic_coordination",
];

export function isExemptFromVolunteerApplication(profile: Profile | null): boolean {
  if (!profile?.role) return false;
  return STAFF_ROLES_EXEMPT_FROM_APPLICATION.includes(profile.role);
}

export function requiresVolunteerApplication(
  profile: Profile | null,
  application: VolunteerApplication | null | undefined
): boolean {
  if (!profile) return false;
  if (isExemptFromVolunteerApplication(profile)) return false;
  return application == null;
}

export function isApplicationPendingReview(
  profile: Profile | null,
  application: VolunteerApplication | null | undefined
): boolean {
  if (!profile || isExemptFromVolunteerApplication(profile)) return false;
  if (!application) return false;
  return application.status === "pending" || application.status === "needs_followup";
}
