import type { SupabaseClient } from "@supabase/supabase-js";
import { formatHomeAddress } from "@/lib/volunteers/contact-fields";
import { sortTrapTeams } from "@/lib/trap-teams/sort-teams";
import type { UserRole, VolunteerRole } from "@/lib/types";

export interface VolunteerDirectoryEntry {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  volunteer_roles: VolunteerRole[];
  platform_role: UserRole;
  team_id: string | null;
  team_name: string | null;
  address: string;
  home_city: string | null;
  home_zip: string | null;
}

const PROFILE_FIELDS =
  "id, full_name, email, phone, volunteer_roles, role, team_id, home_street, home_city, home_state, home_zip, home_county";

export async function loadVolunteerDirectory(service: SupabaseClient): Promise<{
  entries: VolunteerDirectoryEntry[];
  teams: { id: string; name: string }[];
}> {
  const [{ data: profiles }, { data: teams }, { data: applications }] = await Promise.all([
    service.from("profiles").select(PROFILE_FIELDS).not("role", "is", null).order("full_name"),
    service.from("trap_teams").select("id, name").eq("is_active", true),
    service.from("volunteer_applications").select("email, phone").eq("status", "approved"),
  ]);

  const teamNameById = new Map((teams ?? []).map((team) => [team.id, team.name]));
  const phonesByEmail = new Map<string, string>();

  for (const profile of profiles ?? []) {
    if (profile.phone?.trim()) {
      phonesByEmail.set(profile.email.toLowerCase(), profile.phone.trim());
    }
  }
  for (const application of applications ?? []) {
    const email = application.email?.toLowerCase();
    const phone = application.phone?.trim();
    if (email && phone && !phonesByEmail.has(email)) {
      phonesByEmail.set(email, phone);
    }
  }

  const entries = (profiles ?? [])
    .filter((profile) => profile.role)
    .map((profile): VolunteerDirectoryEntry => {
      const email = profile.email.toLowerCase();
      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        phone: phonesByEmail.get(email) ?? profile.phone ?? null,
        volunteer_roles: (profile.volunteer_roles ?? []) as VolunteerRole[],
        platform_role: profile.role as UserRole,
        team_id: profile.team_id,
        team_name: profile.team_id ? teamNameById.get(profile.team_id) ?? null : null,
        address: formatHomeAddress(profile),
        home_city: profile.home_city ?? null,
        home_zip: profile.home_zip ?? null,
      };
    })
    .sort((left, right) =>
      (left.full_name ?? left.email).localeCompare(right.full_name ?? right.email, undefined, {
        sensitivity: "base",
      })
    );

  return {
    entries,
    teams: sortTrapTeams((teams ?? []).map((team) => ({ id: team.id, name: team.name }))),
  };
}
