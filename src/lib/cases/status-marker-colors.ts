import { INTAKE_QUEUE_STATUSES } from "@/lib/cases/statuses";
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
  cat_trapped: "#0d9488",
  transported: "#1d4ed8",
  checked_in: "#65a30d",
  completed: "#15803d",
  closed: "#64748b",
};

export const DEFAULT_MARKER_COLOR = "#64748b";

/** Single marker color for all open intake cases on the hotspots map. */
export const HOTSPOT_OPEN_CASE_COLOR = "#2563eb";

export const HOTSPOT_COLONY_LEGEND = [
  { label: "Open Cases", color: HOTSPOT_OPEN_CASE_COLOR },
  { label: "Closed", color: STATUS_MARKER_COLORS.closed },
] as const;

export function statusMarkerColor(status: HelpRequestStatus): string {
  return STATUS_MARKER_COLORS[status] ?? DEFAULT_MARKER_COLOR;
}

export function hotspotColonyMarkerColor(status: HelpRequestStatus): string {
  if (status === "closed") return STATUS_MARKER_COLORS.closed;
  if (INTAKE_QUEUE_STATUSES.includes(status)) return HOTSPOT_OPEN_CASE_COLOR;
  return DEFAULT_MARKER_COLOR;
}
