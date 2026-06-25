import { CASE_STATUSES } from "@/lib/constants";
import type { HelpRequest, HelpRequestStatus, UserRole } from "@/lib/types";

/** Statuses shown on the inquiry queue by default (pre-trap workflow). */
export const INTAKE_QUEUE_STATUSES: HelpRequestStatus[] = [
  "new_intake",
  "under_review",
  "needs_more_info",
];

/** Colony hotspots map — open intake cases and closed cases only. */
export const HOTSPOT_COLONY_STATUSES: HelpRequestStatus[] = [
  ...INTAKE_QUEUE_STATUSES,
  "closed",
];

export function isHotspotColonyStatus(status: HelpRequestStatus) {
  return HOTSPOT_COLONY_STATUSES.includes(status);
}

/** Statuses intake/inquiry volunteers may set on a case. */
export const INTAKE_EDITABLE_STATUSES: HelpRequestStatus[] = [
  "new_intake",
  "under_review",
  "needs_more_info",
  "routed_to_trap_team",
];

/** Statuses shown on trap queue navigation and loaded into the trap queue view. */
export const TRAP_KANBAN_STATUSES: HelpRequestStatus[] = [
  "routed_to_trap_team",
  "claimed",
  "appointment_needed",
  "appointment_reserved",
];

/** Statuses trap team may set on a case (includes post-appointment workflow). */
export const TRAP_QUEUE_STATUSES: HelpRequestStatus[] = [
  ...TRAP_KANBAN_STATUSES,
  "cat_trapped",
  "transported",
  "checked_in",
];

const TRAP_STATUS_LABEL_OVERRIDES: Partial<Record<HelpRequestStatus, string>> = {
  appointment_reserved: "Appointment Scheduled",
};

export function isTrapCasePersonallyClaimed(
  hr: Pick<HelpRequest, "claimed_by_email" | "claimed_by_name" | "assigned_to" | "status">
): boolean {
  if (hr.status === "claimed") return true;
  return Boolean(
    hr.claimed_by_email?.trim() || hr.claimed_by_name?.trim() || hr.assigned_to?.trim()
  );
}

/** Trap queue nav buckets — claimed-by-person overrides "routed" when status hasn't caught up. */
export function matchesTrapQueueNavStatus(
  hr: HelpRequest,
  navStatus: (typeof TRAP_KANBAN_STATUSES)[number]
): boolean {
  if (navStatus === "claimed") {
    return (
      hr.status === "claimed" ||
      (hr.status === "routed_to_trap_team" && isTrapCasePersonallyClaimed(hr))
    );
  }

  if (navStatus === "routed_to_trap_team") {
    return hr.status === "routed_to_trap_team" && !isTrapCasePersonallyClaimed(hr);
  }

  return hr.status === navStatus;
}

export function getStatusLabel(status: HelpRequestStatus, context: "trap" | "default" = "default") {
  if (context === "trap" && TRAP_STATUS_LABEL_OVERRIDES[status]) {
    return TRAP_STATUS_LABEL_OVERRIDES[status]!;
  }
  return CASE_STATUSES.find((entry) => entry.value === status)?.label ?? status.replace(/_/g, " ");
}

export function getStatusOptionsForRole(role: UserRole | null | undefined) {
  if (role === "inquiry_team") {
    return filterStatusOptions(INTAKE_EDITABLE_STATUSES);
  }
  if (role === "trap_team_lead" || role === "volunteer") {
    return filterStatusOptions([...TRAP_QUEUE_STATUSES, "completed", "closed"]);
  }
  return CASE_STATUSES;
}

function filterStatusOptions(statuses: HelpRequestStatus[]) {
  const allowed = new Set(statuses);
  return CASE_STATUSES.filter((entry) => allowed.has(entry.value));
}

export function isIntakeQueueStatus(status: HelpRequestStatus) {
  return INTAKE_QUEUE_STATUSES.includes(status);
}
