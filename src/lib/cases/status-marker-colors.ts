import { INTAKE_QUEUE_STATUSES, TRAP_KANBAN_STATUSES } from "@/lib/cases/statuses";
import type { HelpRequestStatus } from "@/lib/types";

/** High-contrast map marker colors — distinct hues for each workflow stage. */
export const STATUS_MARKER_COLORS: Record<HelpRequestStatus, string> = {
  new_intake: "#2563eb",
  under_review: "#ca8a04",
  needs_more_info: "#ea580c",
  routed_to_trap_team: "#9333ea",
  claimed: "#c026d3",
  appointment_needed: "#db2777",
  appointment_reserved: "#0891b2",
  cat_trapped: "#0891b2",
  transported: "#0891b2",
  checked_in: "#0891b2",
  completed: "#15803d",
  closed: "#64748b",
};

export const DEFAULT_MARKER_COLOR = "#64748b";

/** Single marker color for all open intake cases on the hotspots map. */
export const HOTSPOT_OPEN_CASE_COLOR = "#2563eb";

export const HOTSPOT_COLONY_LEGEND = [
  { label: "Inquiry queue", color: HOTSPOT_OPEN_CASE_COLOR },
  { label: "Routed to trap team", color: STATUS_MARKER_COLORS.routed_to_trap_team },
  { label: "Claimed", color: STATUS_MARKER_COLORS.claimed },
  { label: "Appointment needed", color: STATUS_MARKER_COLORS.appointment_needed },
  { label: "Appointment scheduled", color: STATUS_MARKER_COLORS.appointment_reserved },
  { label: "Closed", color: STATUS_MARKER_COLORS.closed },
] as const;

export function statusMarkerColor(status: HelpRequestStatus): string {
  return STATUS_MARKER_COLORS[status] ?? DEFAULT_MARKER_COLOR;
}

export function hotspotColonyMarkerColor(status: HelpRequestStatus): string {
  if (status === "closed") return STATUS_MARKER_COLORS.closed;
  if (INTAKE_QUEUE_STATUSES.includes(status)) return HOTSPOT_OPEN_CASE_COLOR;
  if (TRAP_KANBAN_STATUSES.includes(status)) {
    return STATUS_MARKER_COLORS[status] ?? DEFAULT_MARKER_COLOR;
  }
  return DEFAULT_MARKER_COLOR;
}
