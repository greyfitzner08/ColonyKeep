import { CASE_STATUSES } from "@/lib/constants";
import { APPOINTMENTS_UI_ENABLED } from "@/lib/features";
import type { HelpRequestStatus } from "@/lib/types";
import type { ExportableTableId } from "@/lib/admin/table-export-catalog";
import type { ReportType } from "@/lib/reports/aggregations";
import type { PivotDataset } from "@/lib/reports/pivot";

const APPOINTMENT_CASE_STATUSES = new Set<HelpRequestStatus>([
  "appointment_needed",
  "appointment_reserved",
]);

/** Case statuses shown in report filters / status summaries. */
export function reportCaseStatuses() {
  if (APPOINTMENTS_UI_ENABLED) return CASE_STATUSES;
  return CASE_STATUSES.filter((entry) => !APPOINTMENT_CASE_STATUSES.has(entry.value));
}

export function isAppointmentTiedReportType(type: ReportType): boolean {
  return type === "clinic_usage";
}

export function isAppointmentTiedPivotDataset(dataset: PivotDataset): boolean {
  return dataset === "appointments";
}

export function isAppointmentTiedExportTable(id: ExportableTableId): boolean {
  return id === "appointments";
}

export function showAppointmentTiedReports(): boolean {
  return APPOINTMENTS_UI_ENABLED;
}
