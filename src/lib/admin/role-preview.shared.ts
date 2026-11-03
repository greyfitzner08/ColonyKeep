import { ROLE_PERMISSIONS } from "@/lib/constants";
import type { Profile, UserRole, VolunteerRole } from "@/lib/types";

export const ROLE_PREVIEW_COOKIE = "tnvr_admin_role_preview";

/** Cookie / API key for assigned-cases-only TNVR preview. */
export const TNVR_ASSIGNED_ONLY_PREVIEW_KEY = "trap_team_lead_assigned_only";

/** Platform roles admins can preview (interests are not access tiers). */
export const PLATFORM_ROLE_PREVIEW_OPTIONS: { key: string; label: string }[] = [
  { key: "trap_team_lead", label: "TNVR team" },
  {
    key: TNVR_ASSIGNED_ONLY_PREVIEW_KEY,
    label: "TNVR team (assigned cases only)",
  },
  { key: "volunteer", label: "Volunteer" },
];

/** @deprecated Use PLATFORM_ROLE_PREVIEW_OPTIONS */
export const PREVIEWABLE_PLATFORM_ROLES: UserRole[] = ["trap_team_lead", "volunteer"];

/** @deprecated Interests no longer change page access; kept for cookie compatibility. */
export const VOLUNTEER_ROLES_EXCLUDED_FROM_PREVIEW: VolunteerRole[] = [];

export function parseRolePreviewCookie(
  value: string | undefined
): {
  userRole: UserRole;
  volunteerRoles: VolunteerRole[];
  trapQueueAssignedOnly: boolean;
} | null {
  if (!value) return null;

  // Legacy interest cookies collapse to volunteer platform access.
  if (value.startsWith("v:")) {
    return { userRole: "volunteer", volunteerRoles: [], trapQueueAssignedOnly: false };
  }

  // Retired Inquiry Team preview → TNVR team tools.
  if (value === "inquiry_team") {
    return { userRole: "trap_team_lead", volunteerRoles: [], trapQueueAssignedOnly: false };
  }

  if (value === TNVR_ASSIGNED_ONLY_PREVIEW_KEY) {
    return {
      userRole: "trap_team_lead",
      volunteerRoles: [],
      trapQueueAssignedOnly: true,
    };
  }

  if (value === "trap_team_lead" || value === "volunteer") {
    return {
      userRole: value,
      volunteerRoles: [],
      trapQueueAssignedOnly: false,
    };
  }

  return null;
}

export function isValidRolePreviewKey(value: string): boolean {
  return parseRolePreviewCookie(value) != null;
}

export function rolePreviewLabel(previewKey: string | null): string | null {
  const parsed = parseRolePreviewCookie(previewKey ?? undefined);
  if (!parsed) return null;

  if (parsed.trapQueueAssignedOnly) return "TNVR team (assigned cases only)";
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
    trap_queue_assigned_only: preview.trapQueueAssignedOnly,
  };
}
