import type { SupabaseClient } from "@supabase/supabase-js";
import { isTnvrVolunteerProfile } from "@/lib/equipment/volunteers";

export interface CaseAssigneeOption {
  id: string;
  email: string;
  full_name: string | null;
  team_id: string | null;
}

export function caseAssigneeDisplayName(person: CaseAssigneeOption): string {
  return person.full_name?.trim() || person.email;
}

/** TNVR Team + admin profiles available for admin case assignment. */
export async function fetchCaseAssignees(
  service: SupabaseClient,
  options?: { preferredTeamId?: string | null }
): Promise<CaseAssigneeOption[]> {
  const { data, error } = await service
    .from("profiles")
    .select("id, email, full_name, role, volunteer_roles, team_id")
    .not("role", "is", null)
    .order("full_name", { ascending: true });

  if (error || !data) return [];

  const preferredTeamId = options?.preferredTeamId ?? null;

  return data
    .filter((profile) => isTnvrVolunteerProfile(profile) && Boolean(profile.email?.trim()))
    .map((profile) => ({
      id: profile.id as string,
      email: profile.email as string,
      full_name: (profile.full_name as string | null) ?? null,
      team_id: (profile.team_id as string | null) ?? null,
    }))
    .sort((a, b) => {
      if (preferredTeamId) {
        const aMatch = a.team_id === preferredTeamId ? 0 : 1;
        const bMatch = b.team_id === preferredTeamId ? 0 : 1;
        if (aMatch !== bMatch) return aMatch - bMatch;
      }
      return caseAssigneeDisplayName(a).localeCompare(caseAssigneeDisplayName(b), undefined, {
        sensitivity: "base",
      });
    });
}
