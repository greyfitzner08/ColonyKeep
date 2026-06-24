import { TNVR_ROLES } from "@/lib/constants";
import type { EquipmentVolunteerOption, VolunteerRole } from "@/lib/types";

export function isTnvrVolunteerProfile(profile: {
  role?: string | null;
  volunteer_roles?: VolunteerRole[] | null;
}): boolean {
  if (profile.role === "admin" || profile.role === "trap_team_lead") return true;
  if (profile.role !== "volunteer") return false;
  const roles = profile.volunteer_roles ?? [];
  return TNVR_ROLES.some((role) => roles.includes(role));
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
