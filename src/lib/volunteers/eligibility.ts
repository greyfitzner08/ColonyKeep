import { TNVR_ROLES, TRAP_TEAM_SUPPORT_ROLES } from "@/lib/constants";
import type { Profile, VolunteerApplication, VolunteerRole } from "@/lib/types";
import { volunteerRolesForTracking } from "@/lib/volunteers/role-expansion";

function rolesForTrapTeamChecks(
  profile?: Pick<Profile, "volunteer_roles"> | null,
  application?: Pick<VolunteerApplication, "roles_requested"> | null
): VolunteerRole[] {
  return volunteerRolesForTracking(profile, application);
}

export function isTeamEligibleVolunteer(
  application: VolunteerApplication,
  profile?: Pick<Profile, "volunteer_roles"> | null
): boolean {
  return (
    application.status === "approved" &&
    canAssignVolunteerToTeam(application, profile)
  );
}

/** Field roles (trapper, transporter, etc.) — require TNVR certificate and shadow training. */
export function hasTrapVolunteerRoles(
  profile: Pick<Profile, "volunteer_roles"> | null | undefined,
  application: Pick<VolunteerApplication, "roles_requested"> | null | undefined
): boolean {
  return rolesForTrapTeamChecks(profile, application).some((role) =>
    TNVR_ROLES.includes(role)
  );
}

/** Colony support / feeder volunteers — trap team without TNVR training. */
export function hasTrapTeamSupportRoles(
  profile: Pick<Profile, "volunteer_roles"> | null | undefined,
  application: Pick<VolunteerApplication, "roles_requested"> | null | undefined
): boolean {
  return rolesForTrapTeamChecks(profile, application).some((role) =>
    TRAP_TEAM_SUPPORT_ROLES.includes(role)
  );
}

/** Any volunteer role that qualifies for trap team membership. */
export function hasTrapTeamMemberRoles(
  profile: Pick<Profile, "volunteer_roles"> | null | undefined,
  application: Pick<VolunteerApplication, "roles_requested"> | null | undefined
): boolean {
  return hasTrapVolunteerRoles(profile, application) || hasTrapTeamSupportRoles(profile, application);
}

export function requiresTnvrTrainingForTrapTeam(
  profile?: Pick<Profile, "volunteer_roles"> | null,
  application?: Pick<VolunteerApplication, "roles_requested"> | null
): boolean {
  return hasTrapVolunteerRoles(profile, application);
}

/** Field checks for trap team assignment (ignores application status). */
export function canAssignVolunteerToTeam(
  application: Pick<
    VolunteerApplication,
    | "tnvr_certificate_uploaded"
    | "shadow_completed"
    | "roles_requested"
  >,
  profile?: Pick<Profile, "volunteer_roles"> | null
): boolean {
  if (!requiresTnvrTrainingForTrapTeam(profile, application)) {
    return true;
  }

  return Boolean(application.tnvr_certificate_uploaded && application.shadow_completed);
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
      if (!hasTrapTeamMemberRoles(profile, application)) return null;
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
