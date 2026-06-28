import type { SupabaseClient } from "@supabase/supabase-js";
import { formatHomeAddress } from "@/lib/volunteers/contact-fields";
import { resolveContactPrivacy } from "@/lib/volunteers/contact-privacy";
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
  "id, full_name, email, phone, volunteer_roles, role, team_id, home_street, home_city, home_state, home_zip, home_county, show_phone_in_directory, show_address_in_directory";

const PROFILE_FIELDS_LEGACY =
  "id, full_name, email, phone, volunteer_roles, role, team_id, home_street, home_city, home_state, home_zip, home_county";

interface DirectoryProfileRow {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  volunteer_roles: VolunteerRole[] | null;
  role: UserRole | null;
  team_id: string | null;
  home_street: string | null;
  home_city: string | null;
  home_state: string | null;
  home_zip: string | null;
  home_county: string | null;
  show_phone_in_directory?: boolean | null;
  show_address_in_directory?: boolean | null;
}

function isMissingColumnError(message: string | undefined) {
  return Boolean(message?.includes("column") && message.includes("does not exist"));
}

export async function loadVolunteerDirectory(service: SupabaseClient): Promise<{
  entries: VolunteerDirectoryEntry[];
  teams: { id: string; name: string }[];
}> {
  const [{ data: profiles, error: profilesError }, { data: teams }, { data: applications }] =
    await Promise.all([
      service.from("profiles").select(PROFILE_FIELDS).not("role", "is", null).order("full_name"),
      service.from("trap_teams").select("id, name").eq("is_active", true),
      service.from("volunteer_applications").select("email, phone").eq("status", "approved"),
    ]);

  let profileRows: DirectoryProfileRow[] = (profiles ?? []) as DirectoryProfileRow[];

  if (profilesError && isMissingColumnError(profilesError.message)) {
    const legacyResult = await service
      .from("profiles")
      .select(PROFILE_FIELDS_LEGACY)
      .not("role", "is", null)
      .order("full_name");
    profileRows = (legacyResult.data ?? []) as DirectoryProfileRow[];
  }

  const teamNameById = new Map((teams ?? []).map((team) => [team.id, team.name]));
  const phonesByEmail = new Map<string, string>();

  for (const profile of profileRows) {
    const privacy = resolveContactPrivacy(profile);
    if (!privacy.show_phone_in_directory) continue;
    if (profile.phone?.trim()) {
      phonesByEmail.set(profile.email.toLowerCase(), profile.phone.trim());
    }
  }
  for (const application of applications ?? []) {
    const email = application.email?.toLowerCase();
    const phone = application.phone?.trim();
    if (email && phone && !phonesByEmail.has(email)) {
      const profile = profileRows.find((entry) => entry.email.toLowerCase() === email);
      if (profile && !resolveContactPrivacy(profile).show_phone_in_directory) continue;
      phonesByEmail.set(email, phone);
    }
  }

  const entries = profileRows
    .filter((profile) => profile.role)
    .map((profile): VolunteerDirectoryEntry => {
      const email = profile.email.toLowerCase();
      const privacy = resolveContactPrivacy(profile);
      const rawPhone = phonesByEmail.get(email) ?? profile.phone ?? null;
      const rawAddress = formatHomeAddress(profile);

      return {
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        phone: privacy.show_phone_in_directory ? rawPhone : null,
        volunteer_roles: (profile.volunteer_roles ?? []) as VolunteerRole[],
        platform_role: profile.role as UserRole,
        team_id: profile.team_id,
        team_name: profile.team_id ? teamNameById.get(profile.team_id) ?? null : null,
        address: privacy.show_address_in_directory ? rawAddress : "",
        home_city: privacy.show_address_in_directory ? profile.home_city ?? null : null,
        home_zip: privacy.show_address_in_directory ? profile.home_zip ?? null : null,
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
