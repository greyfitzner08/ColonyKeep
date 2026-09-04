import { ROLE_PERMISSIONS, TNVR_ROLES, VOLUNTEER_ROLES } from "@/lib/constants";
import type { Profile, RoleDescription, UserRole, VolunteerRole } from "@/lib/types";

export const ROLE_PREVIEW_COOKIE = "tnvr_admin_role_preview";

/** Volunteer interests covered by Inquiry team or TNVR team platform previews. */
export const VOLUNTEER_ROLES_EXCLUDED_FROM_PREVIEW: VolunteerRole[] = [
  "intake_representative",
  ...TNVR_ROLES,
];

export const PLATFORM_ROLE_PREVIEW_OPTIONS: { key: UserRole; label: string }[] = [
  { key: "inquiry_team", label: "Inquiry team" },
  { key: "trap_team_lead", label: "TNVR team" },
];

/** @deprecated Use PLATFORM_ROLE_PREVIEW_OPTIONS */
export const PREVIEWABLE_PLATFORM_ROLES: UserRole[] = PLATFORM_ROLE_PREVIEW_OPTIONS.map(
  (entry) => entry.key
);

export function volunteerRolesForPreview(catalog: RoleDescription[]): RoleDescription[] {
  return catalog.filter((entry) => !VOLUNTEER_ROLES_EXCLUDED_FROM_PREVIEW.includes(entry.role_id));
}

export function isVolunteerRole(value: string): value is VolunteerRole {
  return VOLUNTEER_ROLES.some((entry) => entry.value === value);
}

export function encodeVolunteerRolePreview(roleId: VolunteerRole): string {
  return `v:${roleId}`;
}

export function parseRolePreviewCookie(
  value: string | undefined
): { userRole: UserRole; volunteerRoles: VolunteerRole[] } | null {
  if (!value) return null;

  if (value.startsWith("v:")) {
    const volunteerRole = value.slice(2);
    if (!isVolunteerRole(volunteerRole)) return null;
    return { userRole: "volunteer", volunteerRoles: [volunteerRole] };
  }

  // Bare platform previews only — no empty "volunteer (general)" option.
  if (PLATFORM_ROLE_PREVIEW_OPTIONS.some((entry) => entry.key === value)) {
    return { userRole: value as UserRole, volunteerRoles: [] };
  }

  return null;
}

export function isValidRolePreviewKey(value: string): boolean {
  return parseRolePreviewCookie(value) != null;
}

export function rolePreviewLabel(
  previewKey: string | null,
  catalog: RoleDescription[]
): string | null {
  const parsed = parseRolePreviewCookie(previewKey ?? undefined);
  if (!parsed) return null;

  if (previewKey?.startsWith("v:")) {
    const roleId = parsed.volunteerRoles[0];
    if (TNVR_ROLES.includes(roleId) || roleId === "intake_representative") {
      return roleId === "intake_representative" ? "Inquiry team" : "TNVR team";
    }
    return catalog.find((entry) => entry.role_id === roleId)?.label ?? roleId.replace(/_/g, " ");
  }

  if (parsed.userRole === "trap_team_lead") return "TNVR team";

  return ROLE_PERMISSIONS[parsed.userRole]?.label ?? null;
}

/** Apply admin role preview for UI and route permission checks. */
export function applyRolePreview(
  profile: Profile | null,
  previewKey: string | null
): Profile | null {
  const preview = parseRolePreviewCookie(previewKey ?? undefined);
  if (!profile || profile.role !== "admin" || !preview) return profile;

  return {
    ...profile,
    role: preview.userRole,
    volunteer_roles: preview.volunteerRoles,
    team_id: preview.userRole === "trap_team_lead" ? profile.team_id : null,
  };
}
