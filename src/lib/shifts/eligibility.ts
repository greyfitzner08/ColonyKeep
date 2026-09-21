import { TNVR_ROLES } from "@/lib/constants";
import type { Profile, Shift, ShiftRequiredRole, ShiftSignupMode, VolunteerRole } from "@/lib/types";

export type ShiftEligibilityProfile = Pick<
  Profile,
  "volunteer_roles" | "tnvr_certificate_uploaded" | "role"
>;

export function isAttendanceShift(shift: Pick<Shift, "signup_mode"> | { signup_mode?: ShiftSignupMode | null }) {
  return (shift.signup_mode ?? "coverage") === "attendance";
}

export function shiftRequiredRoleLabel(required: ShiftRequiredRole): string {
  switch (required) {
    case "tnvr_volunteer":
      return "TNVR-certified roles (trapper, transport, recovery, etc.)";
    case "intake_representative":
      return "Intake Representative";
    case "event_volunteer":
      return "Event Volunteer";
    default:
      return "Any volunteer";
  }
}

/** Whether the volunteer’s approved interests satisfy a shift’s required_roles gate. */
export function volunteerMeetsShiftRequirement(
  profile: ShiftEligibilityProfile | null | undefined,
  required: ShiftRequiredRole
): boolean {
  if (!required || required === "any") return true;
  if (!profile) return false;

  // Platform admins and TNVR team leads can staff any slot.
  if (profile.role === "admin" || profile.role === "trap_team_lead") return true;

  const roles = (profile.volunteer_roles ?? []) as VolunteerRole[];

  if (required === "tnvr_volunteer") {
    return (
      roles.some((role) => TNVR_ROLES.includes(role)) ||
      Boolean(profile.tnvr_certificate_uploaded)
    );
  }

  return roles.includes(required);
}

export function shiftSignupBlockedReason(
  profile: ShiftEligibilityProfile | null | undefined,
  required: ShiftRequiredRole
): string | null {
  if (volunteerMeetsShiftRequirement(profile, required)) return null;
  return `This slot requires ${shiftRequiredRoleLabel(required)}. Ask an admin if you need that role approved.`;
}
