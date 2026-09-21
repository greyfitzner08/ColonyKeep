import { CASE_STATUSES } from "@/lib/constants";
import { normalizeZip } from "@/lib/cases/assign-team-by-zip";
import type {
  ReportAppointment,
  ReportCat,
  ReportClinicFix,
  ReportFilters,
  ReportHelpRequest,
  ReportTrapTeam,
} from "@/lib/reports/aggregations";
import { DEFAULT_REPORT_FILTERS, filterHelpRequests } from "@/lib/reports/aggregations";

export type PivotDataset = "cases" | "cats" | "appointments" | "clinic_fixes";

export type PivotDimension =
  | "status"
  | "team"
  | "zip"
  | "county"
  | "city"
  | "month"
  | "year"
  | "quarter"
  | "trapper"
  | "clinic"
  | "age_category"
  | "appointment_status";

export type PivotMeasure = "count" | "sum_cats" | "sum_adults" | "sum_kittens";

export interface PivotConfig {
  name: string;
  description?: string;
  dataset: PivotDataset;
  rows: PivotDimension[];
  columns: PivotDimension[];
  measure: PivotMeasure;
  filters: Pick<ReportFilters, "dateFrom" | "dateTo" | "zip" | "teamId" | "status" | "clinicId">;
}

export const DEFAULT_PIVOT_CONFIG: PivotConfig = {
  name: "Untitled pivot",
  description: "",
  dataset: "cases",
  rows: ["team"],
  columns: ["status"],
  measure: "count",
  filters: {
    dateFrom: "",
    dateTo: "",
    zip: "",
    teamId: "",
    status: "",
    clinicId: "",
  },
};

export interface PivotFieldOption {
  value: PivotDimension | PivotMeasure | PivotDataset;
  label: string;
}

export const PIVOT_DATASETS: { value: PivotDataset; label: string; hint: string }[] = [
  { value: "cases", label: "Cases", hint: "Colony help requests / trap queue cases" },
  { value: "cats", label: "Tracked cats", hint: "Individual cats linked to cases" },
  { value: "appointments", label: "Appointments", hint: "Clinic appointment slots" },
  { value: "clinic_fixes", label: "Clinic fixes", hint: "Logged clinic outcomes" },
];

export const PIVOT_MEASURES: { value: PivotMeasure; label: string; datasets: PivotDataset[] }[] = [
  { value: "count", label: "Count of records", datasets: ["cases", "cats", "appointments", "clinic_fixes"] },
  { value: "sum_cats", label: "Sum of cats reported", datasets: ["cases"] },
  { value: "sum_adults", label: "Sum of adults reported", datasets: ["cases"] },
  { value: "sum_kittens", label: "Sum of kittens reported", datasets: ["cases"] },
];

const DIMENSION_META: Record<
  PivotDimension,
  { label: string; datasets: PivotDataset[] }
> = {
  status: { label: "Case status", datasets: ["cases"] },
  team: { label: "Trap team", datasets: ["cases", "cats", "appointments", "clinic_fixes"] },
  zip: { label: "Colony ZIP", datasets: ["cases", "cats", "appointments", "clinic_fixes"] },
  county: { label: "County", datasets: ["cases", "cats", "appointments", "clinic_fixes"] },
  city: { label: "City", datasets: ["cases", "cats", "appointments", "clinic_fixes"] },
  month: { label: "Month", datasets: ["cases", "cats", "appointments", "clinic_fixes"] },
  year: { label: "Year", datasets: ["cases", "cats", "appointments", "clinic_fixes"] },
  quarter: { label: "Quarter", datasets: ["cases", "cats", "appointments", "clinic_fixes"] },
  trapper: { label: "Trapper / worker", datasets: ["cases"] },
  clinic: { label: "Clinic", datasets: ["cats", "appointments", "clinic_fixes"] },
  age_category: { label: "Age category", datasets: ["cats", "clinic_fixes"] },
  appointment_status: { label: "Appointment status", datasets: ["appointments"] },
};

export function dimensionsForDataset(dataset: PivotDataset): { value: PivotDimension; label: string }[] {
  return (Object.entries(DIMENSION_META) as [PivotDimension, (typeof DIMENSION_META)[PivotDimension]][])
    .filter(([, meta]) => meta.datasets.includes(dataset))
    .map(([value, meta]) => ({ value, label: meta.label }));
}

export function measuresForDataset(dataset: PivotDataset): { value: PivotMeasure; label: string }[] {
  return PIVOT_MEASURES.filter((entry) => entry.datasets.includes(dataset)).map((entry) => ({
    value: entry.value,
    label: entry.label,
  }));
}

export function dimensionLabel(dimension: PivotDimension): string {
  return DIMENSION_META[dimension]?.label ?? dimension;
}

interface FlatRecord {
  values: Partial<Record<PivotDimension, string>>;
  measureValue: number;
}

function inDateRange(isoDate: string, from: string, to: string): boolean {
  const day = isoDate.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function monthKey(iso: string): string {
  return iso.slice(0, 7) || "Unknown";
}

function yearKey(iso: string): string {
  return iso.slice(0, 4) || "Unknown";
}

function quarterKey(iso: string): string {
  const year = iso.slice(0, 4);
  const month = Number(iso.slice(5, 7));
  if (!year || !month) return "Unknown";
  const quarter = Math.ceil(month / 3);
  return `${year}-Q${quarter}`;
}

function statusLabel(status: string): string {
  return CASE_STATUSES.find((entry) => entry.value === status)?.label ?? status.replace(/_/g, " ");
}

function caseDimensions(hr: ReportHelpRequest): Partial<Record<PivotDimension, string>> {
  const created = hr.created_at || "";
  return {
    status: statusLabel(hr.status),
    team: hr.assigned_team_name?.trim() || "Unassigned",
    zip: normalizeZip(hr.colony_zip) || "Unknown",
    county: hr.colony_county?.trim() || "Unknown",
    city: hr.colony_city?.trim() || "Unknown",
    month: monthKey(created),
    year: yearKey(created),
    quarter: quarterKey(created),
    trapper:
      hr.trapper_trap_loaner?.trim() ||
      hr.claimed_by_name?.trim() ||
      hr.claimed_by_email?.trim() ||
      "Unassigned",
  };
}

function buildCaseRecords(
  helpRequests: ReportHelpRequest[],
  teams: ReportTrapTeam[],
  filters: PivotConfig["filters"],
  measure: PivotMeasure
): FlatRecord[] {
  const reportFilters: ReportFilters = {
    ...DEFAULT_REPORT_FILTERS,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    zip: filters.zip,
    teamId: filters.teamId,
    status: filters.status,
  };
  const filtered = filterHelpRequests(helpRequests, reportFilters, teams);
  return filtered.map((hr) => {
    let measureValue = 1;
    if (measure === "sum_cats") {
      measureValue = (hr.cats_over_8_weeks ?? 0) + (hr.kittens_under_8_weeks ?? 0);
    } else if (measure === "sum_adults") {
      measureValue = hr.cats_over_8_weeks ?? 0;
    } else if (measure === "sum_kittens") {
      measureValue = hr.kittens_under_8_weeks ?? 0;
    }
    return { values: caseDimensions(hr), measureValue };
  });
}

function buildLinkedRecords(options: {
  dataset: Exclude<PivotDataset, "cases">;
  helpRequests: ReportHelpRequest[];
  teams: ReportTrapTeam[];
  cats: ReportCat[];
  appointments: ReportAppointment[];
  clinicFixes: ReportClinicFix[];
  filters: PivotConfig["filters"];
}): FlatRecord[] {
  const { dataset, helpRequests, teams, cats, appointments, clinicFixes, filters } = options;
  const reportFilters: ReportFilters = {
    ...DEFAULT_REPORT_FILTERS,
    dateFrom: "",
    dateTo: "",
    zip: filters.zip,
    teamId: filters.teamId,
    status: filters.status,
  };
  const cases = filterHelpRequests(helpRequests, reportFilters, teams, { skipDateFilter: true });
  const caseById = new Map(cases.map((hr) => [hr.id, hr]));

  if (dataset === "cats") {
    return cats
      .filter((cat) => {
        if (!caseById.has(cat.help_request_id)) return false;
        if (filters.clinicId && cat.clinic_id !== filters.clinicId) return false;
        const date = cat.trap_date ?? cat.created_at;
        return inDateRange(date, filters.dateFrom, filters.dateTo);
      })
      .map((cat) => {
        const hr = caseById.get(cat.help_request_id)!;
        const date = cat.trap_date ?? cat.created_at;
        return {
          values: {
            ...caseDimensions(hr),
            month: monthKey(date),
            year: yearKey(date),
            quarter: quarterKey(date),
            clinic: cat.clinic_name?.trim() || "No clinic recorded",
            age_category: cat.age_category ?? "Unknown",
          },
          measureValue: 1,
        };
      });
  }

  if (dataset === "appointments") {
    return appointments
      .filter((appt) => {
        if (appt.help_request_id && !caseById.has(appt.help_request_id)) return false;
        if (filters.clinicId && appt.clinic_id !== filters.clinicId) return false;
        return inDateRange(appt.date, filters.dateFrom, filters.dateTo);
      })
      .map((appt) => {
        const hr = appt.help_request_id ? caseById.get(appt.help_request_id) : null;
        return {
          values: {
            ...(hr ? caseDimensions(hr) : {}),
            month: monthKey(appt.date),
            year: yearKey(appt.date),
            quarter: quarterKey(appt.date),
            clinic: appt.clinic_name?.trim() || "Unknown clinic",
            appointment_status: appt.status || "Unknown",
            team: hr?.assigned_team_name?.trim() || "Unassigned",
            zip: hr ? normalizeZip(hr.colony_zip) || "Unknown" : "Unknown",
          },
          measureValue: 1,
        };
      });
  }

  return clinicFixes
    .filter((fix) => {
      if (!caseById.has(fix.help_request_id)) return false;
      return inDateRange(fix.fix_date, filters.dateFrom, filters.dateTo);
    })
    .map((fix) => {
      const hr = caseById.get(fix.help_request_id)!;
      return {
        values: {
          ...caseDimensions(hr),
          month: monthKey(fix.fix_date),
          year: yearKey(fix.fix_date),
          quarter: quarterKey(fix.fix_date),
          clinic: fix.clinic_name?.trim() || "No clinic recorded",
          age_category: fix.age_category ?? "Unknown",
        },
        measureValue: 1,
      };
    });
}

function compositeKey(parts: string[]): string {
  return parts.join("||");
}

function splitKey(key: string): string[] {
  return key.split("||");
}

export interface PivotTableResult {
  rowFields: PivotDimension[];
  columnFields: PivotDimension[];
  measure: PivotMeasure;
  measureLabel: string;
  rowKeys: string[];
  columnKeys: string[];
  /** matrix[rowIndex][columnIndex] */
  matrix: number[][];
  rowTotals: number[];
  columnTotals: number[];
  grandTotal: number;
  recordCount: number;
}

export function runPivot(options: {
  config: PivotConfig;
  helpRequests: ReportHelpRequest[];
  cats: ReportCat[];
  appointments: ReportAppointment[];
  clinicFixes: ReportClinicFix[];
  teams: ReportTrapTeam[];
}): PivotTableResult {
  const { config, helpRequests, cats, appointments, clinicFixes, teams } = options;
  const rowFields = config.rows.slice(0, 2);
  const columnFields = config.columns.slice(0, 2);
  const measure = config.measure;

  const records =
    config.dataset === "cases"
      ? buildCaseRecords(helpRequests, teams, config.filters, measure)
      : buildLinkedRecords({
          dataset: config.dataset,
          helpRequests,
          teams,
          cats,
          appointments,
          clinicFixes,
          filters: config.filters,
        });

  const cellMap = new Map<string, number>();
  const rowKeySet = new Set<string>();
  const columnKeySet = new Set<string>();

  for (const record of records) {
    const rowParts = rowFields.map((field) => record.values[field] ?? "—");
    const colParts =
      columnFields.length > 0
        ? columnFields.map((field) => record.values[field] ?? "—")
        : ["Total"];
    const rowKey = compositeKey(rowParts);
    const colKey = compositeKey(colParts);
    rowKeySet.add(rowKey);
    columnKeySet.add(colKey);
    const cellKey = `${rowKey}::${colKey}`;
    cellMap.set(cellKey, (cellMap.get(cellKey) ?? 0) + record.measureValue);
  }

  const rowKeys = Array.from(rowKeySet).sort((a, b) => a.localeCompare(b));
  const columnKeys = Array.from(columnKeySet).sort((a, b) => a.localeCompare(b));

  const matrix = rowKeys.map((rowKey) =>
    columnKeys.map((colKey) => cellMap.get(`${rowKey}::${colKey}`) ?? 0)
  );

  const rowTotals = matrix.map((row) => row.reduce((sum, value) => sum + value, 0));
  const columnTotals = columnKeys.map((_, colIndex) =>
    matrix.reduce((sum, row) => sum + (row[colIndex] ?? 0), 0)
  );
  const grandTotal = rowTotals.reduce((sum, value) => sum + value, 0);

  return {
    rowFields,
    columnFields,
    measure,
    measureLabel: PIVOT_MEASURES.find((entry) => entry.value === measure)?.label ?? measure,
    rowKeys,
    columnKeys,
    matrix,
    rowTotals,
    columnTotals,
    grandTotal,
    recordCount: records.length,
  };
}

export function formatPivotKey(key: string): string {
  return splitKey(key).join(" · ");
}

export function pivotToCsv(result: PivotTableResult): string {
  const header = [
    ...result.rowFields.map(dimensionLabel),
    ...result.columnKeys.map(formatPivotKey),
    "Row total",
  ];
  const lines = [
    header.map((cell) => `"${cell.replace(/"/g, '""')}"`).join(","),
    ...result.rowKeys.map((rowKey, rowIndex) => {
      const rowParts = splitKey(rowKey);
      const cells = [
        ...rowParts,
        ...(result.matrix[rowIndex] ?? []).map(String),
        String(result.rowTotals[rowIndex] ?? 0),
      ];
      return cells.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(",");
    }),
    [
      ...result.rowFields.map((_, index) => (index === 0 ? "Column total" : "")),
      ...result.columnTotals.map(String),
      String(result.grandTotal),
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(","),
  ];
  return lines.join("\n");
}

export function sanitizePivotConfig(input: unknown): PivotConfig | null {
  if (!input || typeof input !== "object") return null;
  const raw = input as Partial<PivotConfig>;
  const dataset = PIVOT_DATASETS.some((entry) => entry.value === raw.dataset)
    ? (raw.dataset as PivotDataset)
    : "cases";
  const allowedDims = new Set(dimensionsForDataset(dataset).map((entry) => entry.value));
  const allowedMeasures = new Set(measuresForDataset(dataset).map((entry) => entry.value));
  const rows = (Array.isArray(raw.rows) ? raw.rows : [])
    .filter((value): value is PivotDimension => allowedDims.has(value as PivotDimension))
    .slice(0, 2);
  const columns = (Array.isArray(raw.columns) ? raw.columns : [])
    .filter((value): value is PivotDimension => allowedDims.has(value as PivotDimension))
    .slice(0, 2);
  const measure = allowedMeasures.has(raw.measure as PivotMeasure)
    ? (raw.measure as PivotMeasure)
    : "count";
  const filters = {
    dateFrom: typeof raw.filters?.dateFrom === "string" ? raw.filters.dateFrom : "",
    dateTo: typeof raw.filters?.dateTo === "string" ? raw.filters.dateTo : "",
    zip: typeof raw.filters?.zip === "string" ? raw.filters.zip : "",
    teamId: typeof raw.filters?.teamId === "string" ? raw.filters.teamId : "",
    status: typeof raw.filters?.status === "string" ? raw.filters.status : "",
    clinicId: typeof raw.filters?.clinicId === "string" ? raw.filters.clinicId : "",
  };

  return {
    name: typeof raw.name === "string" && raw.name.trim() ? raw.name.trim() : "Untitled pivot",
    description: typeof raw.description === "string" ? raw.description : "",
    dataset,
    rows: rows.length > 0 ? rows : ["team"],
    columns,
    measure,
    filters,
  };
}
