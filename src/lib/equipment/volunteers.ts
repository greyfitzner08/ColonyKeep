import type { EquipmentVolunteerOption, VolunteerRole } from "@/lib/types";

/** Platform role labeled "TNVR Team" — the only people who keep trap equipment. */
export function isTnvrVolunteerProfile(profile: {
  role?: string | null;
  volunteer_roles?: VolunteerRole[] | null;
}): boolean {
  return profile.role === "trap_team_lead";
}

export function buildVolunteerOptions(
  profiles: Array<{
    id: string;
    email: string;
    full_name: string | null;
    volunteer_roles?: VolunteerRole[] | null;
    team_id?: string | null;
    role?: string | null;
  }>,
  phonesByEmail: Map<string, string>,
  teamId?: string | null
): EquipmentVolunteerOption[] {
  return profiles
    .filter((profile) => {
      if (!isTnvrVolunteerProfile(profile)) return false;
      if (teamId && profile.team_id !== teamId) return false;
      return true;
    })
    .map((profile) => ({
      id: profile.id,
      email: profile.email,
      full_name: profile.full_name,
      phone: phonesByEmail.get(profile.email.toLowerCase()) ?? null,
      volunteer_roles: profile.volunteer_roles ?? [],
    }))
    .sort((a, b) =>
      (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email, undefined, {
        sensitivity: "base",
      })
    );
}

export function volunteerDisplayName(volunteer: EquipmentVolunteerOption | null | undefined): string {
  if (!volunteer) return "—";
  return volunteer.full_name?.trim() || volunteer.email;
}
