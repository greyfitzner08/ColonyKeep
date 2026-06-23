import type { Profile, VolunteerApplication } from "@/lib/types";

export function isTeamEligibleVolunteer(application: VolunteerApplication): boolean {
  return (
    application.status === "approved" &&
    application.tnvr_certificate_uploaded &&
    application.shadow_completed &&
    application.liability_waiver_signed &&
    application.policy_signed
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
    .filter(isTeamEligibleVolunteer)
    .map((application) => {
      const profile = profileByEmail.get(application.email.toLowerCase());
      if (!profile?.role) return null;
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