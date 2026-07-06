import { VOLUNTEER_ROLES } from "@/lib/constants";
import type { RoleDescription, VolunteerRole } from "@/lib/types";
import { VOLUNTEER_ROLE_REQUIREMENTS } from "@/lib/volunteers/role-requirements";
import { ADMIN_ONLY_VOLUNTEER_ROLES, isRoleAllowedOnSignup } from "@/lib/volunteers/age-eligibility";

export const OTHER_VOLUNTEER_ROLE: VolunteerRole = "other";

const DEFAULT_ROLE_DESCRIPTIONS: RoleDescription[] = VOLUNTEER_ROLES.map((role) => ({
  id: `default-${role.value}`,
  role_id: role.value,
  label: role.label,
  description: `Support the TNVR mission as a ${role.label.toLowerCase()}.`,
  requirements:
    VOLUNTEER_ROLE_REQUIREMENTS.find((entry) => entry.role === role.value)?.requires.map(String) ??
    [],
  created_at: "",
  updated_at: "",
}));

/** Merge DB role descriptions with defaults, preserving signup order from VOLUNTEER_ROLES. */
export function resolveVolunteerRoleCatalog(
  roleDescriptions: RoleDescription[],
  disabledRoleIds: VolunteerRole[] = []
): RoleDescription[] {
  const disabled = new Set(disabledRoleIds);
  const merged = new Map<VolunteerRole, RoleDescription>();

  for (const defaults of DEFAULT_ROLE_DESCRIPTIONS) {
    merged.set(defaults.role_id, defaults);
  }

  for (const entry of roleDescriptions) {
    const existing = merged.get(entry.role_id);
    merged.set(entry.role_id, existing
      ? {
          ...existing,
          ...entry,
          requirements: entry.requirements ?? existing.requirements ?? [],
        }
      : {
          ...entry,
          requirements: entry.requirements ?? [],
        });
  }

  return [
    ...VOLUNTEER_ROLES.map((role) => merged.get(role.value)).filter(
      (entry): entry is RoleDescription => entry != null && !disabled.has(entry.role_id)
    ),
    ...Array.from(merged.values())
      .filter(
        (entry) =>
          !disabled.has(entry.role_id) &&
          !VOLUNTEER_ROLES.some((role) => role.value === entry.role_id)
      )
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];
}

/** Roles shown on the volunteer signup form (includes Other; excludes admin-only labels). */
export function signupVolunteerRoleOptions(catalog: RoleDescription[]): RoleDescription[] {
  return catalog.filter((entry) => !ADMIN_ONLY_VOLUNTEER_ROLES.includes(entry.role_id));
}

/** Canonical volunteer role list for signup, application approval, and admin role descriptions. */
export const applicationVolunteerRoleOptions = signupVolunteerRoleOptions;

export function filterSignupRoleDescriptions(
  catalog: RoleDescription[],
  birthday: string | null | undefined
): RoleDescription[] {
  return catalog.filter((entry) => isRoleAllowedOnSignup(entry.role_id, birthday));
}

/** All configured volunteer roles (admin settings, no signup filters). */
export function allVolunteerRoleOptions(catalog: RoleDescription[]): RoleDescription[] {
  return catalog;
}

/** @deprecated Use signupVolunteerRoleOptions — same list. */
export function adminAssignableVolunteerRoles(catalog: RoleDescription[]): RoleDescription[] {
  return signupVolunteerRoleOptions(catalog);
}

export function volunteerRoleLabel(
  role: VolunteerRole,
  catalog: RoleDescription[]
): string {
  return catalog.find((entry) => entry.role_id === role)?.label ?? role.replace(/_/g, " ");
}
