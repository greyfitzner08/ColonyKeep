import { isKnownUserRole } from "@/lib/constants";
import type { Profile, UserRole, VolunteerApplication, VolunteerRole } from "@/lib/types";
import { volunteerRequirementSource } from "@/lib/volunteers/requirement-source";
import {
  missingRequirementsForRole,
  requirementsForRole,
  requirementLabel,
  type RequirementField,
} from "@/lib/volunteers/role-requirements";

/** Platform roles that do not require a volunteer application on file. */
export const STAFF_ROLES_EXEMPT_FROM_APPLICATION: UserRole[] = [
  "inquiry_team",
  "trap_team_lead",
];

/** Requirement fields volunteers can complete themselves at login (before using the portal). */
export const USER_COMPLETABLE_REQUIREMENTS: RequirementField[] = [
  "liability_waiver_signed",
  "policy_signed",
];

export function isExemptFromVolunteerApplication(
  profile: Pick<Profile, "role"> | null
): boolean {
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

export function volunteerRolesForRequirementCheck(
  profile: Profile | null,
  application: VolunteerApplication | null | undefined
): VolunteerRole[] {
  const profileRoles = profile?.volunteer_roles ?? [];
  if (profileRoles.length > 0) return profileRoles;
  return application?.roles_requested ?? [];
}

export function needsImportedUserRequirementConfirmation(
  application: VolunteerApplication | null | undefined
): boolean {
  return Boolean(application?.imported_via_csv) && !application?.user_requirements_completed_at;
}

export function getMissingUserCompletableRequirements(
  profile: Profile | null,
  application: VolunteerApplication | null | undefined
): RequirementField[] {
  if (!profile || !application || application.status !== "approved") return [];

  const roles = volunteerRolesForRequirementCheck(profile, application);
  if (roles.length === 0) return [];

  if (needsImportedUserRequirementConfirmation(application)) {
    const required = new Set<RequirementField>();
    for (const role of roles) {
      for (const field of requirementsForRole(role)) {
        if (USER_COMPLETABLE_REQUIREMENTS.includes(field)) {
          required.add(field);
        }
      }
    }
    return Array.from(required);
  }

  const source = volunteerRequirementSource(application, profile);
  const missing = new Set<RequirementField>();

  for (const role of roles) {
    for (const field of missingRequirementsForRole(role, source)) {
      if (USER_COMPLETABLE_REQUIREMENTS.includes(field)) {
        missing.add(field);
      }
    }
  }

  return Array.from(missing);
}

export function requiresVolunteerRequirementCompletion(
  profile: Profile | null,
  application: VolunteerApplication | null | undefined
): boolean {
  if (!profile || isExemptFromVolunteerApplication(profile)) return false;
  if (!application || application.status !== "approved") return false;
  if (!isKnownUserRole(profile.role)) return false;
  return getMissingUserCompletableRequirements(profile, application).length > 0;
}

export function missingRequirementLabels(
  profile: Profile | null,
  application: VolunteerApplication | null | undefined
): string[] {
  return getMissingUserCompletableRequirements(profile, application).map(requirementLabel);
}
