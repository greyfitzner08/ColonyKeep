import { ROLE_PERMISSIONS } from "@/lib/constants";
import type { Profile, UserRole, VolunteerRole } from "@/lib/types";

export const ROLE_PREVIEW_COOKIE = "tnvr_admin_role_preview";

/** Platform roles admins can preview (interests are not access tiers). */
export const PLATFORM_ROLE_PREVIEW_OPTIONS: { key: UserRole; label: string }[] = [
  { key: "inquiry_team", label: "Inquiry team" },
  { key: "trap_team_lead", label: "TNVR team" },
  { key: "volunteer", label: "Volunteer" },
];

/** @deprecated Use PLATFORM_ROLE_PREVIEW_OPTIONS */
export const PREVIEWABLE_PLATFORM_ROLES: UserRole[] = PLATFORM_ROLE_PREVIEW_OPTIONS.map(
  (entry) => entry.key
);

/** @deprecated Interests no longer change page access; kept for cookie compatibility. */
export const VOLUNTEER_ROLES_EXCLUDED_FROM_PREVIEW: VolunteerRole[] = [];

export function parseRolePreviewCookie(
  value: string | undefined
): { userRole: UserRole; volunteerRoles: VolunteerRole[] } | null {
  if (!value) return null;

  // Legacy interest cookies collapse to volunteer platform access.
  if (value.startsWith("v:")) {
    return { userRole: "volunteer", volunteerRoles: [] };
  }

  if (PLATFORM_ROLE_PREVIEW_OPTIONS.some((entry) => entry.key === value)) {
    return { userRole: value as UserRole, volunteerRoles: [] };
  }

  return null;
}

export function isValidRolePreviewKey(value: string): boolean {
  return parseRolePreviewCookie(value) != null;
}

export function rolePreviewLabel(previewKey: string | null): string | null {
  const parsed = parseRolePreviewCookie(previewKey ?? undefined);
  if (!parsed) return null;

  if (parsed.userRole === "trap_team_lead") return "TNVR team";
  if (parsed.userRole === "volunteer") return "Volunteer";

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
