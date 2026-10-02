import { TNVR_ROLES } from "@/lib/constants";
import type {
  Profile,
  Shift,
  ShiftRequiredRole,
  ShiftRsvpButtons,
  ShiftSignupMode,
  VolunteerRole,
} from "@/lib/types";

export type ShiftEligibilityProfile = Pick<
  Profile,
  "volunteer_roles" | "tnvr_certificate_uploaded" | "role"
>;

export function isAttendanceShift(shift: Pick<Shift, "signup_mode"> | { signup_mode?: ShiftSignupMode | null }) {
  return (shift.signup_mode ?? "coverage") === "attendance";
}

export const DEFAULT_ATTENDING_BUTTON_LABEL = "I'm attending";
export const DEFAULT_DECLINE_BUTTON_LABEL = "Can't make it";

export interface ResponseButtonChoice {
  showAttending: boolean;
  showDecline: boolean;
  attendingLabel: string;
  declineLabel: string;
}

export function shiftRsvpButtons(
  shift: { rsvp_buttons?: ShiftRsvpButtons | string | null }
): ShiftRsvpButtons {
  if (
    shift.rsvp_buttons === "attending" ||
    shift.rsvp_buttons === "decline" ||
    shift.rsvp_buttons === "none"
  ) {
    return shift.rsvp_buttons;
  }
  return "both";
}

export function responseButtonsFromChoice(
  choice: Pick<ResponseButtonChoice, "showAttending" | "showDecline">
): ShiftRsvpButtons {
  if (choice.showAttending && choice.showDecline) return "both";
  if (choice.showAttending) return "attending";
  if (choice.showDecline) return "decline";
  return "none";
}

export function choiceFromShift(shift: {
  rsvp_buttons?: ShiftRsvpButtons | string | null;
  attending_label?: string | null;
  decline_label?: string | null;
}): ResponseButtonChoice {
  const buttons = shiftRsvpButtons(shift);
  return {
    showAttending: buttons === "both" || buttons === "attending",
    showDecline: buttons === "both" || buttons === "decline",
    attendingLabel: buttonLabel(shift.attending_label, DEFAULT_ATTENDING_BUTTON_LABEL),
    declineLabel: buttonLabel(shift.decline_label, DEFAULT_DECLINE_BUTTON_LABEL),
  };
}

export function buttonLabel(value: string | null | undefined, fallback: string): string {
  const text = (value ?? "").replace(/\s+/g, " ").trim();
  return (text || fallback).slice(0, 40);
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
