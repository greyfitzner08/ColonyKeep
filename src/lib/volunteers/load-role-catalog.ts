import type { SupabaseClient } from "@supabase/supabase-js";
import type { RoleDescription, VolunteerRole } from "@/lib/types";
import { resolveVolunteerRoleCatalog } from "@/lib/volunteers/role-catalog";

export async function fetchDisabledVolunteerRoleIds(
  supabase: SupabaseClient
): Promise<VolunteerRole[]> {
  const { data } = await supabase.from("disabled_volunteer_roles").select("role_id");
  return (data ?? []).map((row) => row.role_id as VolunteerRole);
}

export async function fetchVolunteerRoleCatalogInputs(supabase: SupabaseClient) {
  const [{ data: roleDescriptions }, disabledRoleIds] = await Promise.all([
    supabase.from("role_descriptions").select("*").order("label"),
    fetchDisabledVolunteerRoleIds(supabase),
  ]);

  const descriptions = (roleDescriptions ?? []) as RoleDescription[];

  return {
    roleDescriptions: descriptions,
    disabledRoleIds,
    catalog: resolveVolunteerRoleCatalog(descriptions, disabledRoleIds),
  };
}
