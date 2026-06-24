import { isKnownUserRole, ROLE_PERMISSIONS } from "@/lib/constants";
import type { Profile, UserRole } from "@/lib/types";

export const ROLE_PREVIEW_COOKIE = "tnvr_admin_role_preview";

export const PREVIEWABLE_PLATFORM_ROLES: UserRole[] = (
  Object.keys(ROLE_PERMISSIONS) as UserRole[]
).filter((role) => role !== "admin");

export function parsePreviewRole(value: string | undefined): UserRole | null {
  if (!value || !isKnownUserRole(value) || value === "admin") return null;
  return value;
}

/** Apply admin role preview for UI and route permission checks. */
export function applyRolePreview(
  profile: Profile | null,
  previewRole: UserRole | null
): Profile | null {
  if (!profile || profile.role !== "admin" || !previewRole) return profile;

  return {
    ...profile,
    role: previewRole,
    volunteer_roles: [],
    team_id: previewRole === "trap_team_lead" ? profile.team_id : null,
  };
}
