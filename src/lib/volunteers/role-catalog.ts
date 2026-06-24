import { VOLUNTEER_ROLES } from "@/lib/constants";
import type { RoleDescription, VolunteerRole } from "@/lib/types";

export const OTHER_VOLUNTEER_ROLE: VolunteerRole = "other";

const DEFAULT_ROLE_DESCRIPTIONS: RoleDescription[] = VOLUNTEER_ROLES.map((role) => ({
  id: `default-${role.value}`,
  role_id: role.value,
  label: role.label,
  description: `Support the TNVR mission as a ${role.label.toLowerCase()}.`,
  created_at: "",
  updated_at: "",
}));

/** Merge DB role descriptions with defaults, preserving signup order from VOLUNTEER_ROLES. */
export function resolveVolunteerRoleCatalog(
  roleDescriptions: RoleDescription[]
): RoleDescription[] {
  const merged = new Map<VolunteerRole, RoleDescription>();

  for (const defaults of DEFAULT_ROLE_DESCRIPTIONS) {
    merged.set(defaults.role_id, defaults);
  }

  for (const entry of roleDescriptions) {
    const existing = merged.get(entry.role_id);
    merged.set(entry.role_id, existing ? { ...existing, ...entry } : entry);
  }

  return VOLUNTEER_ROLES.map((role) => merged.get(role.value)).filter(
    (entry): entry is RoleDescription => entry != null
  );
}

/** Roles shown on the volunteer signup form (includes Other). */
export function signupVolunteerRoleOptions(catalog: RoleDescription[]): RoleDescription[] {
  return catalog;
}

/** Roles admins may assign — same as signup except Other is signup-only. */
export function adminAssignableVolunteerRoles(catalog: RoleDescription[]): RoleDescription[] {
  return catalog.filter((entry) => entry.role_id !== OTHER_VOLUNTEER_ROLE);
}

export function volunteerRoleLabel(
  role: VolunteerRole,
  catalog: RoleDescription[]
): string {
  return catalog.find((entry) => entry.role_id === role)?.label ?? role.replace(/_/g, " ");
}
