import type { SupabaseClient } from "@supabase/supabase-js";
import { isValidRoleId, normalizeRoleId, roleIdValidationError } from "@/lib/volunteers/role-id";
import type { VolunteerRole } from "@/lib/types";

export type CreateVolunteerRoleInput = {
  label: string;
  description?: string;
  roleId?: string;
  isSignupActive?: boolean;
  requirements?: string[];
};

export async function createVolunteerRole(
  service: SupabaseClient,
  input: CreateVolunteerRoleInput
): Promise<{ roleId: VolunteerRole; error?: string }> {
  const label = input.label.trim();
  const description =
    input.description?.trim() ||
    `Volunteer role imported from CSV: ${label}.`;
  const requirements = input.requirements ?? [];
  const isSignupActive = input.isSignupActive ?? true;

  if (!label) {
    return { roleId: "other" as VolunteerRole, error: "Role name is required." };
  }

  const roleId = normalizeRoleId(input.roleId?.trim() || label);
  const roleIdError = roleIdValidationError(roleId);
  if (roleIdError || !isValidRoleId(roleId)) {
    return { roleId: "other" as VolunteerRole, error: roleIdError ?? "Invalid role id." };
  }

  const payload = {
    label,
    description,
    requirements,
    is_signup_active: isSignupActive,
  };

  const { data: existing } = await service
    .from("role_descriptions")
    .select("id, role_id")
    .eq("role_id", roleId)
    .maybeSingle();

  if (existing) {
    const { error } = await service
      .from("role_descriptions")
      .update(payload)
      .eq("id", existing.id);

    if (error) {
      return { roleId: roleId as VolunteerRole, error: error.message };
    }
  } else {
    const { error: enumError } = await service.rpc("admin_add_volunteer_role", {
      new_role: roleId,
    });

    if (enumError) {
      return { roleId: roleId as VolunteerRole, error: enumError.message };
    }

    const { error } = await service.from("role_descriptions").insert({
      role_id: roleId,
      ...payload,
    });

    if (error) {
      return { roleId: roleId as VolunteerRole, error: error.message };
    }
  }

  await service.from("disabled_volunteer_roles").delete().eq("role_id", roleId);

  return { roleId: roleId as VolunteerRole };
}
