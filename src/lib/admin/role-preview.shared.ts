import { isKnownUserRole, ROLE_PERMISSIONS, VOLUNTEER_ROLES } from "@/lib/constants";
import type { Profile, RoleDescription, UserRole, VolunteerRole } from "@/lib/types";

export const ROLE_PREVIEW_COOKIE = "tnvr_admin_role_preview";

export const PREVIEWABLE_PLATFORM_ROLES: UserRole[] = (
  Object.keys(ROLE_PERMISSIONS) as UserRole[]
).filter((role) => role !== "admin");

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

  if (isKnownUserRole(value) && value !== "admin") {
    return { userRole: value, volunteerRoles: [] };
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
    return catalog.find((entry) => entry.role_id === roleId)?.label ?? roleId.replace(/_/g, " ");
  }

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
