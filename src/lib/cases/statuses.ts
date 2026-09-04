import { CASE_STATUSES } from "@/lib/constants";
import type { HelpRequest, HelpRequestStatus, UserRole } from "@/lib/types";

/** Case management lifecycle — separate from trap workflow stages. */
export type CaseLifecycleStatus = "open" | "in_progress" | "on_hold" | "closed";

export const CASE_LIFECYCLE_STATUSES: { value: CaseLifecycleStatus; label: string }[] = [
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "on_hold", label: "On hold" },
  { value: "closed", label: "Closed" },
];

export const LIFECYCLE_STATUS_COLORS: Record<CaseLifecycleStatus, string> = {
  open: "bg-sky-100 text-sky-800",
  in_progress: "bg-amber-100 text-amber-900",
  on_hold: "bg-orange-100 text-orange-900",
  closed: "bg-slate-200 text-slate-700",
};

const TRAP_WORKFLOW_STATUSES = new Set<HelpRequestStatus>([
  "claimed",
  "routed_to_trap_team",
  "appointment_needed",
  "appointment_reserved",
  "cat_trapped",
  "transported",
  "checked_in",
]);

/** Map stored workflow status → case-management lifecycle. */
export function toCaseLifecycleStatus(
  hr: Pick<HelpRequest, "status" | "claimed_by_email"> | HelpRequestStatus
): CaseLifecycleStatus {
  const status = typeof hr === "string" ? hr : hr.status;
  const claimedByEmail = typeof hr === "string" ? null : hr.claimed_by_email;

  if (status === "closed" || status === "completed") return "closed";
  if (status === "needs_more_info") return "on_hold";
  if (TRAP_WORKFLOW_STATUSES.has(status)) return "in_progress";
  if (claimedByEmail?.trim()) return "in_progress";
  return "open";
}

export function getCaseLifecycleLabel(
  hr: Pick<HelpRequest, "status" | "claimed_by_email"> | HelpRequestStatus
): string {
  const lifecycle = toCaseLifecycleStatus(hr);
  return CASE_LIFECYCLE_STATUSES.find((entry) => entry.value === lifecycle)?.label ?? lifecycle;
}

/**
 * Apply a lifecycle choice onto the stored status.
 * Preserves trap workflow detail when staying in "in progress".
 */
export function applyCaseLifecycleStatus(
  current: HelpRequestStatus,
  next: CaseLifecycleStatus
): HelpRequestStatus {
  if (toCaseLifecycleStatus(current) === next) return current;

  switch (next) {
    case "open":
      return "under_review";
    case "in_progress":
      if (TRAP_WORKFLOW_STATUSES.has(current)) return current;
      return "claimed";
    case "on_hold":
      return "needs_more_info";
    case "closed":
      return "closed";
  }
}

/** Statuses shown on the inquiry queue by default (pre-trap workflow). */
export const INTAKE_QUEUE_STATUSES: HelpRequestStatus[] = [
  "new_intake",
  "under_review",
  "needs_more_info",
];

/** Statuses shown in the inquiry queue status filter (pre-trap only). */
export const INTAKE_FILTER_STATUSES: HelpRequestStatus[] = [...INTAKE_QUEUE_STATUSES];

/** Statuses intake/inquiry volunteers may set on a case (routing uses a dedicated action). */
export const INTAKE_EDITABLE_STATUSES: HelpRequestStatus[] = [...INTAKE_QUEUE_STATUSES];

/** Statuses shown on trap queue navigation and loaded into the trap queue view. */
export const TRAP_KANBAN_STATUSES: HelpRequestStatus[] = [
  "routed_to_trap_team",
  "claimed",
  "appointment_needed",
  "appointment_reserved",
];

/** Colony hotspots map — inquiry queue, active trap workflow, and closed cases. */
export const HOTSPOT_COLONY_STATUSES: HelpRequestStatus[] = [
  ...INTAKE_QUEUE_STATUSES,
  ...TRAP_KANBAN_STATUSES,
  "closed",
];

export function isHotspotColonyStatus(status: HelpRequestStatus) {
  return HOTSPOT_COLONY_STATUSES.includes(status);
}

/** No longer used as case statuses — kept for legacy reads until migrated. */
export const DEPRECATED_HELP_REQUEST_STATUSES: HelpRequestStatus[] = [
  "cat_trapped",
  "transported",
  "checked_in",
];

/** Statuses trap team may set on a case. */
export const TRAP_EDITABLE_STATUSES: HelpRequestStatus[] = [
  ...TRAP_KANBAN_STATUSES,
  "completed",
  "closed",
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

/** Case detail / inquiry status — lifecycle only (not trap workflow milestones). */
export function getInquiryTeamStatusLabel(
  hr: Pick<HelpRequest, "status" | "claimed_by_email">
): string {
  return getCaseLifecycleLabel(hr);
}

export function inquiryTeamManagesStatus(status: HelpRequestStatus) {
  return isIntakeQueueStatus(status);
}

export function getStatusOptionsForRole(role: UserRole | null | undefined) {
  const deprecated = new Set(DEPRECATED_HELP_REQUEST_STATUSES);

  if (role === "inquiry_team") {
    return filterStatusOptions(INTAKE_FILTER_STATUSES);
  }
  if (role === "trap_team_lead" || role === "volunteer") {
    return filterStatusOptions(TRAP_EDITABLE_STATUSES);
  }
  return CASE_STATUSES.filter((entry) => !deprecated.has(entry.value));
}

function filterStatusOptions(statuses: HelpRequestStatus[]) {
  const allowed = new Set(statuses);
  return CASE_STATUSES.filter((entry) => allowed.has(entry.value));
}

export function isIntakeQueueStatus(status: HelpRequestStatus) {
  return INTAKE_QUEUE_STATUSES.includes(status);
}
