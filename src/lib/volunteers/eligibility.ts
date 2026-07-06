import { TNVR_ROLES } from "@/lib/constants";
import type { Profile, VolunteerApplication, VolunteerRole } from "@/lib/types";
import { volunteerRolesForTracking } from "@/lib/volunteers/role-expansion";

export function isTeamEligibleVolunteer(
  application: VolunteerApplication,
  profile?: Pick<Profile, "volunteer_roles"> | null
): boolean {
  return (
    application.status === "approved" &&
    canAssignVolunteerToTeam(application, profile)
  );
}

/** Field checks for trap team assignment (ignores application status). */
export function canAssignVolunteerToTeam(
  application: Pick<
    VolunteerApplication,
    | "tnvr_certificate_uploaded"
    | "shadow_completed"
    | "liability_waiver_signed"
    | "policy_signed"
    | "roles_requested"
  >,
  profile?: Pick<Profile, "volunteer_roles"> | null
): boolean {
  const roles = volunteerRolesForTracking(profile, application);
  const trapRoles = roles.filter((role) => TNVR_ROLES.includes(role));

  if (!application.liability_waiver_signed || !application.policy_signed) {
    return false;
  }

  if (trapRoles.length === 0) {
    return true;
  }

  return application.tnvr_certificate_uploaded && application.shadow_completed;
}

export function hasTrapVolunteerRoles(
  profile: Pick<Profile, "volunteer_roles"> | null | undefined,
  application: Pick<VolunteerApplication, "roles_requested"> | null | undefined
): boolean {
  return volunteerRolesForTracking(profile, application).some((role) =>
    TNVR_ROLES.includes(role)
  );
}

export interface TeamEligibleVolunteer {
  profile: Profile;
  application: VolunteerApplication;
}

export function getTeamEligibleVolunteers(
  applications: VolunteerApplication[],
  profiles: Profile[]
): TeamEligibleVolunteer[] {
  const profileByEmail = new Map(
    profiles.map((profile) => [profile.email.toLowerCase(), profile])
  );

  return applications
    .map((application) => {
      const profile = profileByEmail.get(application.email.toLowerCase());
      if (!profile?.role || !isTeamEligibleVolunteer(application, profile)) return null;
      if (!hasTrapVolunteerRoles(profile, application)) return null;
      return { profile, application };
    })
    .filter((entry): entry is TeamEligibleVolunteer => entry !== null)
    .sort((a, b) =>
      (a.profile.full_name ?? a.profile.email).localeCompare(
        b.profile.full_name ?? b.profile.email
      )
    );
}

export function getApplicationByEmail(
  applications: VolunteerApplication[],
  email: string
): VolunteerApplication | undefined {
  return applications.find(
    (application) => application.email.toLowerCase() === email.toLowerCase()
  );
}
