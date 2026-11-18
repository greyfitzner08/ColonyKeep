import {
  ADOPTION_APPLICATION_STATUSES,
  adoptionApplicationStatusLabel,
  type AdoptionApplicationStatus,
} from "@/lib/adoption/application";
import {
  ADOPTABLE_CAT_STATUSES,
  adoptableCatStatusLabel,
  type AdoptableCatStatus,
} from "@/lib/adoption/constants";
import { findTrapTeamForZip, normalizeZip } from "@/lib/cases/assign-team-by-zip";
import { isOpenTrapQueueCase } from "@/lib/cases/statuses";
import {
  isDuplicateClosedCase,
  omitsReportedCatsFromReports,
} from "@/lib/cases/duplicate-closed";
import { fosterFacilityLabel, type FosterFacility } from "@/lib/cases/foster-facility";
import { CASE_STATUSES } from "@/lib/constants";
import { reportCaseStatuses } from "@/lib/reports/visibility";
import { sortTrapTeams } from "@/lib/trap-teams/sort-teams";
import type { HelpRequestStatus } from "@/lib/types";
import { formatDate } from "@/lib/utils";

export interface ReportCat {
  id: string;
  help_request_id: string;
  clinic_id: string | null;
  clinic_name: string | null;
  trap_date: string | null;
  created_at: string;
  name?: string | null;
  age_category: "adult" | "kitten" | null;
  went_to_foster_facility: boolean | null;
  transferred_unfixed?: boolean | null;
  already_fixed?: boolean | null;
  foster_facility: FosterFacility | null;
  foster_facility_other: string | null;
}

export interface ReportClinicFix {
  id: string;
  help_request_id: string;
  cat_id: string | null;
  fix_date: string;
  clinic_name: string | null;
  age_category: "adult" | "kitten" | null;
  went_to_foster_facility: boolean;
  foster_facility: FosterFacility | null;
  foster_facility_other: string | null;
}

export interface ReportAppointment {
  id: string;
  clinic_id: string;
  clinic_name: string;
  date: string;
  status: string;
  help_request_id: string | null;
}

export interface ReportClinic {
  id: string;
  name: string;
  is_active: boolean;
}

export interface ReportTrapTeam {
  id: string;
  name: string;
  zip_codes: string[];
  is_active: boolean;
}

export interface ReportHelpRequest {
  id: string;
  case_number: string;
  status: HelpRequestStatus;
  outcome?: string | null;
  contact_name: string;
  contact_email: string;
  colony_city: string;
  colony_county: string;
  colony_zip: string;
  kittens_under_8_weeks: number;
  cats_over_8_weeks: number;
  cats_remaining?: number | null;
  outcome_tnvr_count?: number | null;
  assigned_team_id: string | null;
  assigned_team_name: string | null;
  claimed_by_email: string | null;
  claimed_by_name: string | null;
  trapper_trap_loaner: string | null;
  created_at: string;
}

export type ReportType =
  | "queue_cats_by_zip"
  | "queue_cats_by_team"
  | "queue_cats_by_month"
  | "inquiries_by_zip"
  | "inquiries_by_team"
  | "cases_by_trapper"
  | "cases_by_team"
  | "cats_by_clinic"
  | "cats_by_foster_facility"
  | "foster_placements_detail"
  | "clinic_usage"
  | "case_status_summary"
  | "case_detail"
  | "reporter_emails"
  | "adoptable_cats_by_status"
  | "adoptable_cats_detail"
  | "adoption_applications_by_status"
  | "adoption_applications_detail";

export interface ReportAdoptableCat {
  id: string;
  name: string;
  sex: string | null;
  status: AdoptableCatStatus;
  created_at: string;
  fosterName: string;
  petStore: string;
}

export interface ReportAdoptionApplication {
  id: string;
  status: AdoptionApplicationStatus;
  applicantName: string;
  applicantEmail: string;
  catInterestName: string;
  linkedCatName: string;
  created_at: string;
}

export function isAdoptionProgramReport(type: ReportType): boolean {
  return (
    type === "adoptable_cats_by_status" ||
    type === "adoptable_cats_detail" ||
    type === "adoption_applications_by_status" ||
    type === "adoption_applications_detail"
  );
}

export interface ReportFilters {
  dateFrom: string;
  dateTo: string;
  zip: string;
  teamId: string;
  clinicId: string;
  trapper: string;
  status: string;
  intakeOnly: boolean;
}

export const DEFAULT_REPORT_FILTERS: ReportFilters = {
  dateFrom: "",
  dateTo: "",
  zip: "",
  teamId: "",
  clinicId: "",
  trapper: "",
  status: "",
  intakeOnly: false,
};

/** One record that contributed to a report total. */
export interface ReportSource {
  id: string;
  href?: string;
  title: string;
  detail: string;
}

export interface ReportRow {
  key: string;
  label: string;
  sublabel?: string;
  count: number;
  cats?: number;
  extra?: Record<string, string | number>;
  sources?: ReportSource[];
}

export interface ReportResult {
  title: string;
  description: string;
  columns: { key: string; label: string }[];
  rows: ReportRow[];
  totals: { label: string; value: number }[];
}

function inDateRange(isoDate: string, from: string, to: string): boolean {
  const day = isoDate.slice(0, 10);
  if (from && day < from) return false;
  if (to && day > to) return false;
  return true;
}

function teamForRequest(hr: ReportHelpRequest, teams: ReportTrapTeam[]): { id: string; name: string } | null {
  if (hr.assigned_team_id && hr.assigned_team_name) {
    return { id: hr.assigned_team_id, name: hr.assigned_team_name };
  }
  return findTrapTeamForZip(hr.colony_zip, teams);
}

function catCount(hr: ReportHelpRequest): number {
  if (omitsReportedCatsFromReports(hr)) return 0;
  return (hr.kittens_under_8_weeks ?? 0) + (hr.cats_over_8_weeks ?? 0);
}

export function filterHelpRequests(
  requests: ReportHelpRequest[],
  filters: ReportFilters,
  teams: ReportTrapTeam[],
  options?: { skipDateFilter?: boolean; includeDuplicateClosed?: boolean }
): ReportHelpRequest[] {
  return requests.filter((hr) => {
    if (!options?.includeDuplicateClosed && isDuplicateClosedCase(hr)) return false;
    if (!options?.skipDateFilter && !inDateRange(hr.created_at, filters.dateFrom, filters.dateTo)) {
      return false;
    }
    if (filters.intakeOnly && hr.status !== "new_intake") return false;
    if (filters.zip && normalizeZip(hr.colony_zip) !== normalizeZip(filters.zip)) return false;
    if (filters.status && hr.status !== filters.status) return false;
    if (filters.teamId) {
      const team = teamForRequest(hr, teams);
      if (team?.id !== filters.teamId) return false;
    }
    if (filters.trapper) {
      const needle = filters.trapper.trim().toLowerCase();
      const haystack = [
        hr.trapper_trap_loaner,
        hr.claimed_by_name,
        hr.claimed_by_email,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      if (!haystack.includes(needle)) return false;
    }
    return true;
  });
}

/** Case IDs that may contribute cats / clinic work to reports (excludes closed duplicates). */
export function reportableHelpRequestIds(requests: ReportHelpRequest[]): Set<string> {
  return new Set(requests.filter((hr) => !isDuplicateClosedCase(hr)).map((hr) => hr.id));
}

function filterCats(
  cats: ReportCat[],
  filters: ReportFilters,
  requestIds: Set<string>,
  reportableIds: Set<string>
): ReportCat[] {
  return cats.filter((cat) => {
    if (!reportableIds.has(cat.help_request_id)) return false;
    if (requestIds.size > 0 && !requestIds.has(cat.help_request_id)) return false;
    if (filters.clinicId && cat.clinic_id !== filters.clinicId) return false;
    const date = cat.trap_date ?? cat.created_at;
    if (!inDateRange(date, filters.dateFrom, filters.dateTo)) return false;
    return true;
  });
}

function filterAppointments(
  appointments: ReportAppointment[],
  filters: ReportFilters,
  requestIds: Set<string>,
  reportableIds: Set<string>
): ReportAppointment[] {
  return appointments.filter((appt) => {
    if (appt.help_request_id && !reportableIds.has(appt.help_request_id)) return false;
    if (requestIds.size > 0 && appt.help_request_id && !requestIds.has(appt.help_request_id)) {
      return false;
    }
    if (filters.clinicId && appt.clinic_id !== filters.clinicId) return false;
    if (!inDateRange(appt.date, filters.dateFrom, filters.dateTo)) return false;
    return true;
  });
}

function caseStatusLabel(status: string): string {
  return CASE_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

function caseSource(hr: ReportHelpRequest, detail: string, id = hr.id): ReportSource {
  return {
    id,
    href: `/case/${hr.id}`,
    title: hr.case_number,
    detail,
  };
}

function groupCount(
  items: {
    key: string;
    label: string;
    sublabel?: string;
    cats?: number;
    count?: number;
    source?: ReportSource;
  }[]
): ReportRow[] {
  const map = new Map<string, ReportRow>();
  for (const item of items) {
    const existing = map.get(item.key);
    const add = item.count ?? 1;
    if (existing) {
      existing.count += add;
      existing.cats = (existing.cats ?? 0) + (item.cats ?? 0);
      if (item.source) existing.sources = [...(existing.sources ?? []), item.source];
    } else {
      map.set(item.key, {
        key: item.key,
        label: item.label,
        sublabel: item.sublabel,
        count: add,
        cats: item.cats ?? 0,
        sources: item.source ? [item.source] : [],
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function monthKeyFromIso(iso: string): { key: string; label: string } {
  const key = iso.slice(0, 7);
  if (!/^\d{4}-\d{2}$/.test(key)) return { key: "unknown", label: "Unknown month" };
  const [year, month] = key.split("-").map(Number);
  const date = new Date(year, month - 1, 1);
  return {
    key,
    label: date.toLocaleString("en-US", { month: "short", year: "numeric" }),
  };
}

function transferredUnfixedIds(cats: ReportCat[]): Set<string> {
  return new Set(cats.filter((cat) => cat.transferred_unfixed === true).map((cat) => cat.id));
}

function alreadyFixedIds(cats: ReportCat[]): Set<string> {
  return new Set(cats.filter((cat) => cat.already_fixed === true).map((cat) => cat.id));
}

function clinicFixCountsForRequests(
  clinicFixes: ReportClinicFix[],
  requestIds: Set<string>,
  reportableIds: Set<string>,
  transferredIds: Set<string> = new Set()
): { fixes: Map<string, number>; excludedTransfers: Map<string, number> } {
  const fixes = new Map<string, number>();
  const excludedTransfers = new Map<string, number>();
  for (const fix of clinicFixes) {
    if (!reportableIds.has(fix.help_request_id)) continue;
    if (!requestIds.has(fix.help_request_id)) continue;
    if (fix.cat_id && transferredIds.has(fix.cat_id)) {
      excludedTransfers.set(
        fix.help_request_id,
        (excludedTransfers.get(fix.help_request_id) ?? 0) + 1
      );
      continue;
    }
    fixes.set(fix.help_request_id, (fixes.get(fix.help_request_id) ?? 0) + 1);
  }
  return { fixes, excludedTransfers };
}

function flagCounts(
  cats: ReportCat[],
  requestIds: Set<string>,
  reportableIds: Set<string>,
  flag: "transferred_unfixed" | "already_fixed"
): Map<string, number> {
  const counts = new Map<string, number>();
  for (const cat of cats) {
    if (cat[flag] !== true) continue;
    if (flag === "transferred_unfixed" && cat.already_fixed === true) continue;
    if (!reportableIds.has(cat.help_request_id)) continue;
    if (!requestIds.has(cat.help_request_id)) continue;
    counts.set(cat.help_request_id, (counts.get(cat.help_request_id) ?? 0) + 1);
  }
  return counts;
}

/** Clinic-logged fixes plus public/manual TNR, excluding cats transferred before they were fixed. */
export function caseFixedCount(
  hr: Pick<ReportHelpRequest, "id" | "outcome_tnvr_count">,
  clinicFixCount: number,
  excludedTransferredFixes = 0
): number {
  const outcome = Math.max(0, (hr.outcome_tnvr_count ?? 0) - excludedTransferredFixes);
  return Math.max(clinicFixCount, outcome);
}

function groupRemainingVsFixed(
  items: {
    key: string;
    label: string;
    sublabel?: string;
    remaining: number;
    fixed: number;
    transferred: number;
    alreadyFixed: number;
    source?: ReportSource;
  }[],
  sort: "activity" | "month"
): ReportRow[] {
  const map = new Map<string, ReportRow>();
  for (const item of items) {
    const existing = map.get(item.key);
    if (existing) {
      existing.count += 1;
      existing.extra = {
        remaining: Number(existing.extra?.remaining ?? 0) + item.remaining,
        fixed: Number(existing.extra?.fixed ?? 0) + item.fixed,
        transferred: Number(existing.extra?.transferred ?? 0) + item.transferred,
        alreadyFixed: Number(existing.extra?.alreadyFixed ?? 0) + item.alreadyFixed,
      };
      if (item.source) existing.sources = [...(existing.sources ?? []), item.source];
    } else {
      map.set(item.key, {
        key: item.key,
        label: item.label,
        sublabel: item.sublabel,
        count: 1,
        sources: item.source ? [item.source] : [],
        extra: {
          remaining: item.remaining,
          fixed: item.fixed,
          transferred: item.transferred,
          alreadyFixed: item.alreadyFixed,
        },
      });
    }
  }

  const rows = Array.from(map.values());
  if (sort === "month") {
    return rows.sort((a, b) => a.key.localeCompare(b.key) || a.label.localeCompare(b.label));
  }

  return rows.sort((a, b) => {
    const aWork =
      Number(a.extra?.remaining ?? 0) +
      Number(a.extra?.fixed ?? 0) +
      Number(a.extra?.transferred ?? 0) +
      Number(a.extra?.alreadyFixed ?? 0);
    const bWork =
      Number(b.extra?.remaining ?? 0) +
      Number(b.extra?.fixed ?? 0) +
      Number(b.extra?.transferred ?? 0) +
      Number(b.extra?.alreadyFixed ?? 0);
    return bWork - aWork || b.count - a.count || a.label.localeCompare(b.label);
  });
}

function remainingVsFixedResult(
  title: string,
  description: string,
  groupLabel: string,
  queue: ReportHelpRequest[],
  clinicFixes: ReportClinicFix[],
  cats: ReportCat[],
  reportableIds: Set<string>,
  groupOf: (hr: ReportHelpRequest) => { key: string; label: string; sublabel?: string },
  sort: "activity" | "month",
  includeSublabel = false
): ReportResult {
  const requestIds = new Set(queue.map((hr) => hr.id));
  const excludedCatIds = new Set([
    ...transferredUnfixedIds(cats),
    ...alreadyFixedIds(cats),
  ]);
  const { fixes: fixCounts, excludedTransfers } = clinicFixCountsForRequests(
    clinicFixes,
    requestIds,
    reportableIds,
    excludedCatIds
  );
  const transferredCounts = flagCounts(cats, requestIds, reportableIds, "transferred_unfixed");
  const alreadyFixedCounts = flagCounts(cats, requestIds, reportableIds, "already_fixed");
  const rows = groupRemainingVsFixed(
    queue.map((hr) => {
      const remaining = catCount(hr);
      const fixed = caseFixedCount(
        hr,
        fixCounts.get(hr.id) ?? 0,
        excludedTransfers.get(hr.id) ?? 0
      );
      const transferred = transferredCounts.get(hr.id) ?? 0;
      const alreadyFixed = alreadyFixedCounts.get(hr.id) ?? 0;
      const parts = [
        `Not fixed ${remaining}`,
        `Fixed ${fixed}`,
        transferred > 0 ? `Transferred, not fixed ${transferred}` : "",
        alreadyFixed > 0 ? `Already fixed ${alreadyFixed}` : "",
      ].filter(Boolean);
      const place = [hr.colony_city, normalizeZip(hr.colony_zip)].filter(Boolean).join(", ");
      return {
        ...groupOf(hr),
        remaining,
        fixed,
        transferred,
        alreadyFixed,
        source: caseSource(
          hr,
          `${caseStatusLabel(hr.status)}${place ? ` · ${place}` : ""} · ${parts.join(" · ")}`,
          `queue:${hr.id}`
        ),
      };
    }),
    sort
  );
  const remaining = rows.reduce((sum, row) => sum + Number(row.extra?.remaining ?? 0), 0);
  const fixed = rows.reduce((sum, row) => sum + Number(row.extra?.fixed ?? 0), 0);
  const transferred = rows.reduce((sum, row) => sum + Number(row.extra?.transferred ?? 0), 0);
  const alreadyFixed = rows.reduce((sum, row) => sum + Number(row.extra?.alreadyFixed ?? 0), 0);

  return {
    title,
    description,
    columns: [
      { key: "label", label: groupLabel },
      ...(includeSublabel ? [{ key: "sublabel", label: "County" }] : []),
      { key: "count", label: "Open cases" },
      { key: "extra.remaining", label: "Not fixed" },
      { key: "extra.fixed", label: "Fixed" },
      { key: "extra.transferred", label: "Transferred, not fixed" },
      { key: "extra.alreadyFixed", label: "Already fixed" },
    ],
    rows,
    totals: [
      { label: "Open cases", value: queue.length },
      { label: "Not fixed", value: remaining },
      { label: "Fixed", value: fixed },
      { label: "Transferred, not fixed", value: transferred },
      { label: "Already fixed", value: alreadyFixed },
    ],
  };
}

function filterClinicFixes(
  fixes: ReportClinicFix[],
  filters: ReportFilters,
  requestIds: Set<string>,
  clinics: ReportClinic[],
  reportableIds: Set<string>
): ReportClinicFix[] {
  const selectedClinicName = filters.clinicId
    ? clinics.find((clinic) => clinic.id === filters.clinicId)?.name?.trim()
    : null;

  return fixes.filter((fix) => {
    if (!reportableIds.has(fix.help_request_id)) return false;
    if (requestIds.size > 0 && !requestIds.has(fix.help_request_id)) return false;
    if (!inDateRange(fix.fix_date, filters.dateFrom, filters.dateTo)) return false;
    if (selectedClinicName && fix.clinic_name?.trim() !== selectedClinicName) return false;
    return true;
  });
}

interface FosterPlacement {
  key: string;
  helpRequestId: string;
  catId: string | null;
  facilityLabel: string;
  ageCategory: string;
  placementDate: string;
  source: "fixed_and_transferred" | "transferred_unfixed" | "tracked_cat";
}

function fosterPlacementLabel(
  facility: FosterFacility | null | undefined,
  other: string | null | undefined
): string {
  return fosterFacilityLabel(facility, other) ?? "Unknown location";
}

function collectFosterPlacements(
  clinicFixes: ReportClinicFix[],
  cats: ReportCat[],
  filters: ReportFilters,
  requestIds: Set<string>,
  clinics: ReportClinic[],
  reportableIds: Set<string>
): FosterPlacement[] {
  const filteredFixes = filterClinicFixes(clinicFixes, filters, requestIds, clinics, reportableIds);
  const filteredCats = filterCats(cats, filters, requestIds, reportableIds);
  const placements: FosterPlacement[] = [];
  const catIdsFromFixes = new Set<string>();
  const transferredIds = transferredUnfixedIds(cats);

  for (const fix of filteredFixes) {
    if (!fix.went_to_foster_facility) continue;
    if (fix.cat_id && transferredIds.has(fix.cat_id)) continue;
    if (fix.cat_id) catIdsFromFixes.add(fix.cat_id);
    placements.push({
      key: `fix:${fix.id}`,
      helpRequestId: fix.help_request_id,
      catId: fix.cat_id,
      facilityLabel: fosterPlacementLabel(fix.foster_facility, fix.foster_facility_other),
      ageCategory: fix.age_category ?? "—",
      placementDate: fix.fix_date,
      source: "fixed_and_transferred",
    });
  }

  for (const cat of filteredCats) {
    const transferredUnfixed = cat.transferred_unfixed === true;
    if (!transferredUnfixed && cat.went_to_foster_facility !== true) continue;
    if (!transferredUnfixed && catIdsFromFixes.has(cat.id)) continue;
    placements.push({
      key: `cat:${cat.id}`,
      helpRequestId: cat.help_request_id,
      catId: cat.id,
      facilityLabel: fosterPlacementLabel(cat.foster_facility, cat.foster_facility_other),
      ageCategory: cat.age_category ?? "—",
      placementDate: cat.trap_date ?? cat.created_at,
      source: transferredUnfixed ? "transferred_unfixed" : "tracked_cat",
    });
  }

  return placements.sort((a, b) => b.placementDate.localeCompare(a.placementDate));
}

function inAdoptionDateRange(createdAt: string, filters: ReportFilters): boolean {
  return inDateRange(createdAt, filters.dateFrom, filters.dateTo);
}

function catSexLabel(sex: string | null): string {
  if (sex === "female") return "Female";
  if (sex === "male") return "Male";
  if (sex === "unknown") return "Unknown";
  return "—";
}

function filterAdoptableCats(cats: ReportAdoptableCat[], filters: ReportFilters): ReportAdoptableCat[] {
  return cats.filter((cat) => {
    if (!inAdoptionDateRange(cat.created_at, filters)) return false;
    if (filters.status && cat.status !== filters.status) return false;
    return true;
  });
}

function filterAdoptionApplications(
  applications: ReportAdoptionApplication[],
  filters: ReportFilters
): ReportAdoptionApplication[] {
  return applications.filter((application) => {
    if (!inAdoptionDateRange(application.created_at, filters)) return false;
    if (filters.status && application.status !== filters.status) return false;
    return true;
  });
}

export function runReport(
  type: ReportType,
  filters: ReportFilters,
  helpRequests: ReportHelpRequest[],
  cats: ReportCat[],
  appointments: ReportAppointment[],
  teams: ReportTrapTeam[],
  _clinics: ReportClinic[],
  clinicFixes: ReportClinicFix[] = [],
  adoptableCats: ReportAdoptableCat[] = [],
  adoptionApplications: ReportAdoptionApplication[] = []
): ReportResult {
  const reportableIds = reportableHelpRequestIds(helpRequests);
  const filtered = filterHelpRequests(helpRequests, filters, teams);
  const requestIds = new Set(filtered.map((hr) => hr.id));
  const fosterRequestIds = new Set(
    filterHelpRequests(helpRequests, filters, teams, { skipDateFilter: true }).map((hr) => hr.id)
  );
  const filteredCats = filterCats(cats, filters, requestIds, reportableIds);
  const filteredAppointments = filterAppointments(
    appointments,
    filters,
    requestIds,
    reportableIds
  );
  const fosterPlacements = collectFosterPlacements(
    clinicFixes,
    cats,
    filters,
    fosterRequestIds,
    _clinics,
    reportableIds
  );
  const caseById = new Map(
    helpRequests.filter((hr) => !isDuplicateClosedCase(hr)).map((hr) => [hr.id, hr])
  );
  const catNameById = new Map(cats.map((cat) => [cat.id, cat.name?.trim() || ""]));

  function groupedCaseSource(hr: ReportHelpRequest): ReportSource {
    const place = [hr.colony_city, normalizeZip(hr.colony_zip)].filter(Boolean).join(", ");
    return caseSource(
      hr,
      `${caseStatusLabel(hr.status)}${place ? ` · ${place}` : ""} · ${catCount(hr)} cats`,
      `case:${hr.id}`
    );
  }

  function placementSource(placement: FosterPlacement): ReportSource {
    const hr = caseById.get(placement.helpRequestId);
    const name = (placement.catId && catNameById.get(placement.catId)) || "Unnamed cat";
    const kind =
      placement.source === "transferred_unfixed"
        ? "Transferred, not fixed"
        : placement.source === "fixed_and_transferred"
          ? "Fixed and transferred"
          : "TNVR cat on the case";
    return {
      id: placement.key,
      href: hr ? `/case/${hr.id}` : undefined,
      title: hr?.case_number ?? "Case",
      detail: `${name} · ${placement.ageCategory} · ${formatDate(placement.placementDate)} · ${kind}`,
    };
  }

  switch (type) {
    case "queue_cats_by_zip":
    case "queue_cats_by_team":
    case "queue_cats_by_month": {
      const queue = filtered.filter(isOpenTrapQueueCase);
      if (type === "queue_cats_by_zip") {
        return remainingVsFixedResult(
          "Queue cats remaining vs fixed by ZIP",
          "Open Trap Queue cases only, including claimed. Not fixed is cats still needing TNR. Transferred, not fixed and Already fixed are in neither Not fixed nor Fixed. Already fixed means the cat was already fixed when trapped or reported, and is not counted as a cat we fixed. Fixed is clinic-logged and public TNR.",
          "ZIP code",
          queue,
          clinicFixes,
          cats,
          reportableIds,
          (hr) => ({
            key: normalizeZip(hr.colony_zip) || "unknown",
            label: normalizeZip(hr.colony_zip) || "Unknown ZIP",
            sublabel: hr.colony_county || undefined,
          }),
          "activity",
          true
        );
      }
      if (type === "queue_cats_by_team") {
        return remainingVsFixedResult(
          "Queue cats remaining vs fixed by team",
          "Open Trap Queue cases only, including claimed. Not fixed is cats still needing TNR. Transferred, not fixed and Already fixed are in neither Not fixed nor Fixed. Already fixed means the cat was already fixed when trapped or reported, and is not counted as a cat we fixed. Fixed is clinic-logged and public TNR.",
          "Trap team",
          queue,
          clinicFixes,
          cats,
          reportableIds,
          (hr) => {
            const team = teamForRequest(hr, teams);
            return { key: team?.id ?? "unassigned", label: team?.name ?? "Unassigned" };
          },
          "activity"
        );
      }
      return remainingVsFixedResult(
        "Queue cats remaining vs fixed by month",
        "Open Trap Queue cases grouped by the month the case was created, including claimed. Not fixed is cats still needing TNR. Transferred, not fixed and Already fixed are in neither Not fixed nor Fixed. Already fixed means the cat was already fixed when trapped or reported, and is not counted as a cat we fixed. Fixed is clinic-logged and public TNR.",
        "Month",
        queue,
        clinicFixes,
        cats,
        reportableIds,
        (hr) => monthKeyFromIso(hr.created_at),
        "month"
      );
    }

    case "inquiries_by_zip": {
      const rows = groupCount(
        filtered.map((hr) => ({
          key: normalizeZip(hr.colony_zip) || "unknown",
          label: normalizeZip(hr.colony_zip) || "Unknown ZIP",
          sublabel: hr.colony_county || undefined,
          cats: catCount(hr),
          source: groupedCaseSource(hr),
        }))
      );
      return {
        title: "Inquiry forms by ZIP code",
        description: "Community inquiry submissions grouped by colony ZIP.",
        columns: [
          { key: "label", label: "ZIP code" },
          { key: "sublabel", label: "County" },
          { key: "count", label: "Inquiries" },
          { key: "cats", label: "Cats reported" },
        ],
        rows,
        totals: [
          { label: "Inquiries", value: filtered.length },
          { label: "Cats reported", value: filtered.reduce((sum, hr) => sum + catCount(hr), 0) },
        ],
      };
    }

    case "inquiries_by_team": {
      const rows = groupCount(
        filtered.map((hr) => {
          const team = teamForRequest(hr, teams);
          return {
            key: team?.id ?? "unassigned",
            label: team?.name ?? "Unassigned",
            sublabel: normalizeZip(hr.colony_zip) || undefined,
            cats: catCount(hr),
            source: groupedCaseSource(hr),
          };
        })
      );
      return {
        title: "Inquiry forms by trap team",
        description: "Inquiries grouped by assigned or ZIP-mapped trap team.",
        columns: [
          { key: "label", label: "Trap team" },
          { key: "count", label: "Inquiries" },
          { key: "cats", label: "Cats reported" },
        ],
        rows,
        totals: [
          { label: "Inquiries", value: filtered.length },
          { label: "Teams represented", value: rows.length },
        ],
      };
    }

    case "cases_by_trapper": {
      const trapCases = filtered.filter(
        (hr) => hr.status !== "new_intake" && hr.status !== "under_review"
      );
      const rows = groupCount(
        trapCases.map((hr) => {
          const label =
            hr.trapper_trap_loaner?.trim() ||
            hr.claimed_by_name?.trim() ||
            hr.claimed_by_email?.trim() ||
            "Unassigned";
          return {
            key: label.toLowerCase(),
            label,
            sublabel: hr.assigned_team_name ?? undefined,
            cats: catCount(hr),
            source: groupedCaseSource(hr),
          };
        })
      );
      return {
        title: "Cases by trapper",
        description: "Trap-queue cases grouped by trapper, trap loaner, or case worker.",
        columns: [
          { key: "label", label: "Trapper / worker" },
          { key: "sublabel", label: "Team" },
          { key: "count", label: "Cases" },
          { key: "cats", label: "Cats" },
        ],
        rows,
        totals: [
          { label: "Cases", value: trapCases.length },
          { label: "Trappers", value: rows.length },
        ],
      };
    }

    case "cases_by_team": {
      const rows = groupCount(
        filtered.map((hr) => {
          const team = teamForRequest(hr, teams);
          return {
            key: team?.id ?? "unassigned",
            label: team?.name ?? "Unassigned",
            cats: catCount(hr),
            source: groupedCaseSource(hr),
          };
        })
      );
      const completed = filtered.filter((hr) =>
        ["completed", "closed", "appointment_reserved", "claimed"].includes(hr.status)
      );
      return {
        title: "Cases by trap team",
        description: "All cases grouped by trap team, including completed work.",
        columns: [
          { key: "label", label: "Trap team" },
          { key: "count", label: "Cases" },
          { key: "cats", label: "Cats" },
        ],
        rows,
        totals: [
          { label: "Cases", value: filtered.length },
          { label: "Completed / in field", value: completed.length },
        ],
      };
    }

    case "cats_by_clinic": {
      const casesInScope = new Set(
        filterHelpRequests(helpRequests, filters, teams, { skipDateFilter: true }).map(
          (hr) => hr.id
        )
      );
      const excludedCatIds = new Set([
        ...transferredUnfixedIds(cats),
        ...alreadyFixedIds(cats),
      ]);
      const selectedClinicName = filters.clinicId
        ? _clinics.find((clinic) => clinic.id === filters.clinicId)?.name?.trim()
        : null;
      const fixesOnDate = clinicFixes.filter((fix) => {
        if (!reportableIds.has(fix.help_request_id)) return false;
        if (!casesInScope.has(fix.help_request_id)) return false;
        if (!inDateRange(fix.fix_date, filters.dateFrom, filters.dateTo)) return false;
        if (selectedClinicName && fix.clinic_name?.trim() !== selectedClinicName) return false;
        if (fix.cat_id && excludedCatIds.has(fix.cat_id)) return false;
        return true;
      });
      const clinicRows: {
        key: string;
        label: string;
        cats?: number;
        count?: number;
        source?: ReportSource;
      }[] = fixesOnDate.map((fix) => {
        const label = fix.clinic_name?.trim() || "No clinic recorded";
        const hr = caseById.get(fix.help_request_id);
        const name = (fix.cat_id && catNameById.get(fix.cat_id)) || "Unnamed cat";
        return {
          key: label.toLowerCase(),
          label,
          cats: 1,
          source: {
            id: fix.id,
            href: hr ? `/case/${hr.id}` : undefined,
            title: hr?.case_number ?? "Case",
            detail: `${name} · ${formatDate(fix.fix_date)}`,
          },
        };
      });
      // A case can be marked fixed without a clinic log. Those cats have no fix
      // date, so they are included only when the report is not limited to a date range.
      if (!filters.dateFrom && !filters.dateTo && !selectedClinicName) {
        const { fixes, excludedTransfers } = clinicFixCountsForRequests(
          clinicFixes,
          casesInScope,
          reportableIds,
          excludedCatIds
        );
        for (const hr of filterHelpRequests(helpRequests, filters, teams, { skipDateFilter: true })) {
          const logged = fixes.get(hr.id) ?? 0;
          const fixed = caseFixedCount(hr, logged, excludedTransfers.get(hr.id) ?? 0);
          const unlogged = Math.max(0, fixed - logged);
          if (unlogged > 0) {
            clinicRows.push({
              key: "no clinic recorded",
              label: "No clinic recorded",
              cats: unlogged,
              count: unlogged,
              source: caseSource(
                hr,
                `${unlogged} marked fixed with no clinic`,
                `unlogged:${hr.id}`
              ),
            });
          }
        }
      }
      const rows = groupCount(clinicRows);
      return {
        title: "TNVR cats by clinic",
        description:
          "Cats grouped by the clinic where they were fixed. The date range is the fix date, not the date the case was opened. Cats marked fixed with no clinic are listed as No clinic recorded when no date range is set. Adoptable Cats are not included.",
        columns: [
          { key: "label", label: "Clinic" },
          { key: "count", label: "Cats" },
        ],
        rows,
        totals: [{ label: "Cats", value: clinicRows.length }],
      };
    }

    case "cats_by_foster_facility": {
      const rows = groupCount(
        fosterPlacements.map((placement) => ({
          key: placement.facilityLabel.toLowerCase(),
          label: placement.facilityLabel,
          cats: 1,
          source: placementSource(placement),
        }))
      );
      const adults = fosterPlacements.filter((p) => p.ageCategory === "adult").length;
      const kittens = fosterPlacements.filter((p) => p.ageCategory === "kitten").length;
      const transferredUnfixed = fosterPlacements.filter(
        (placement) => placement.source === "transferred_unfixed"
      ).length;
      return {
        title: "TNVR cats sent to foster / facility",
        description:
          "Trap-case cats recorded as going to foster or a facility, grouped by destination. Transferred, not fixed cats are included here as a destination, and they are not counted as fixed. This is not the Adoptable Cats list.",
        columns: [
          { key: "label", label: "Foster / facility" },
          { key: "count", label: "Cats" },
        ],
        rows,
        totals: [
          { label: "Total sent to foster/facility", value: fosterPlacements.length },
          { label: "Transferred, not fixed", value: transferredUnfixed },
          { label: "Adults", value: adults },
          { label: "Kittens", value: kittens },
          { label: "Destinations", value: rows.length },
        ],
      };
    }

    case "foster_placements_detail": {
      const rows: ReportRow[] = fosterPlacements.map((placement) => {
        const hr = caseById.get(placement.helpRequestId);
        const team = hr ? teamForRequest(hr, teams) : null;
        return {
          key: placement.key,
          label: hr?.case_number ?? placement.helpRequestId,
          sublabel: placement.facilityLabel,
          count: 1,
          extra: {
            age: placement.ageCategory,
            date: placement.placementDate.slice(0, 10),
            zip: hr ? normalizeZip(hr.colony_zip) || "—" : "—",
            team: team?.name ?? "—",
            source:
              placement.source === "transferred_unfixed"
                ? "Transferred, not fixed"
                : placement.source === "fixed_and_transferred"
                  ? "Fixed and transferred"
                  : "TNVR cat on the case",
          },
          sources: [placementSource(placement)],
        };
      });
      return {
        title: "TNVR foster / facility detail",
        description:
          "One row per trap-case cat sent to foster or a facility. The trap team is the case team. Adoptable Cats are a separate list and are not included.",
        columns: [
          { key: "label", label: "Case #" },
          { key: "sublabel", label: "Where the cat went" },
          { key: "extra.age", label: "Age" },
          { key: "extra.date", label: "Date" },
          { key: "extra.zip", label: "ZIP" },
          { key: "extra.team", label: "Trap team" },
          { key: "extra.source", label: "Source" },
        ],
        rows,
        totals: [{ label: "Cats sent to foster/facility", value: rows.length }],
      };
    }

    case "clinic_usage": {
      const rows = groupCount(
        filteredAppointments.map((appt) => {
          const hr = appt.help_request_id ? caseById.get(appt.help_request_id) : undefined;
          return {
            key: appt.clinic_id,
            label: appt.clinic_name,
            source: {
              id: appt.id,
              href: hr ? `/case/${hr.id}` : undefined,
              title: hr?.case_number ?? appt.clinic_name,
              detail: `${formatDate(appt.date)} · ${appt.status || "Unknown status"}`,
            },
          };
        })
      );
      const reserved = filteredAppointments.filter((appt) => appt.status === "reserved").length;
      return {
        title: "Clinic appointment usage",
        description: "Appointments scheduled at each clinic in the filtered date range.",
        columns: [
          { key: "label", label: "Clinic" },
          { key: "count", label: "Appointments" },
        ],
        rows,
        totals: [
          { label: "Appointments", value: filteredAppointments.length },
          { label: "Reserved", value: reserved },
          { label: "Clinics used", value: rows.length },
        ],
      };
    }

    case "case_status_summary": {
      const rows = reportCaseStatuses().map((entry) => {
        const matches = filtered.filter((hr) => hr.status === entry.value);
        return {
          key: entry.value,
          label: entry.label,
          count: matches.length,
          sources: matches.map((hr) => groupedCaseSource(hr)),
        };
      }).filter((row) => row.count > 0);
      return {
        title: "Cases by status",
        description: "Status breakdown for filtered cases.",
        columns: [
          { key: "label", label: "Status" },
          { key: "count", label: "Cases" },
        ],
        rows,
        totals: [{ label: "Cases", value: filtered.length }],
      };
    }

    case "case_detail": {
      const rows: ReportRow[] = filtered.map((hr) => {
        const team = teamForRequest(hr, teams);
        const statusLabel =
          CASE_STATUSES.find((entry) => entry.value === hr.status)?.label ?? hr.status;
        return {
          key: hr.id,
          label: hr.case_number,
          sublabel: hr.contact_name,
          count: catCount(hr),
          cats: catCount(hr),
          extra: {
            email: hr.contact_email?.trim() || "—",
            status: statusLabel,
            zip: normalizeZip(hr.colony_zip) || "—",
            team: team?.name ?? "Unassigned",
            trapper:
              hr.trapper_trap_loaner?.trim() ||
              hr.claimed_by_name?.trim() ||
              hr.claimed_by_email?.trim() ||
              "—",
            created: hr.created_at.slice(0, 10),
            city: hr.colony_city,
          },
          sources: [groupedCaseSource(hr)],
        };
      });
      return {
        title: "Case detail export",
        description: "Row-level case list matching current filters.",
        columns: [
          { key: "label", label: "Case #" },
          { key: "sublabel", label: "Reporter" },
          { key: "extra.email", label: "Reporter email" },
          { key: "extra.status", label: "Status" },
          { key: "extra.zip", label: "ZIP" },
          { key: "extra.team", label: "Team" },
          { key: "extra.trapper", label: "Trapper" },
          { key: "cats", label: "Cats" },
          { key: "extra.created", label: "Created" },
        ],
        rows,
        totals: [{ label: "Cases", value: rows.length }],
      };
    }

    case "reporter_emails": {
      const withEmail = filtered.filter((hr) => hr.contact_email?.trim());
      const unique = new Set(withEmail.map((hr) => hr.contact_email.trim().toLowerCase()));
      const rows: ReportRow[] = withEmail.map((hr) => {
        const team = teamForRequest(hr, teams);
        const statusLabel =
          CASE_STATUSES.find((entry) => entry.value === hr.status)?.label ?? hr.status;
        return {
          key: hr.id,
          label: hr.contact_email.trim(),
          sublabel: hr.contact_name?.trim() || "—",
          count: 1,
          extra: {
            case: hr.case_number,
            status: statusLabel,
            zip: normalizeZip(hr.colony_zip) || "—",
            team: team?.name ?? "Unassigned",
            created: hr.created_at.slice(0, 10),
          },
          sources: [groupedCaseSource(hr)],
        };
      });
      return {
        title: "Reporter emails",
        description:
          "Reporter email addresses from TNVR cases submitted in the selected date range. Use From/To dates and Export CSV.",
        columns: [
          { key: "label", label: "Reporter email" },
          { key: "sublabel", label: "Reporter name" },
          { key: "extra.case", label: "Case #" },
          { key: "extra.created", label: "Submitted" },
          { key: "extra.status", label: "Status" },
          { key: "extra.zip", label: "ZIP" },
          { key: "extra.team", label: "Team" },
        ],
        rows,
        totals: [
          { label: "Cases with email", value: rows.length },
          { label: "Unique emails", value: unique.size },
        ],
      };
    }

    case "adoptable_cats_by_status": {
      const listed = filterAdoptableCats(adoptableCats, filters);
      const rows = ADOPTABLE_CAT_STATUSES.map((entry) => {
        const matches = listed.filter((cat) => cat.status === entry.value);
        return {
          key: entry.value,
          label: entry.label,
          count: matches.length,
          sources: matches.map((cat) => ({
            id: cat.id,
            href: "/adoption",
            title: cat.name,
            detail: [catSexLabel(cat.sex), cat.fosterName, cat.petStore].filter(Boolean).join(" · ") || "Adoptable cat",
          })),
        };
      }).filter((row) => row.count > 0);
      return {
        title: "Adoptable cats by status",
        description:
          "Cats on the Adoption list, grouped by status. These cats are not assigned to a trap team.",
        columns: [
          { key: "label", label: "Status" },
          { key: "count", label: "Cats" },
        ],
        rows,
        totals: [{ label: "Adoptable cats", value: listed.length }],
      };
    }

    case "adoptable_cats_detail": {
      const listed = filterAdoptableCats(adoptableCats, filters);
      const rows: ReportRow[] = listed.map((cat) => ({
        key: cat.id,
        label: cat.name,
        sublabel: adoptableCatStatusLabel(cat.status),
        count: 1,
        extra: {
          sex: catSexLabel(cat.sex),
          foster: cat.fosterName || "—",
          store: cat.petStore || "—",
          added: cat.created_at.slice(0, 10),
        },
        sources: [
          {
            id: cat.id,
            href: "/adoption",
            title: cat.name,
            detail: [adoptableCatStatusLabel(cat.status), catSexLabel(cat.sex), cat.fosterName, cat.petStore]
              .filter(Boolean)
              .join(" · "),
          },
        ],
      }));
      return {
        title: "Adoptable cats",
        description:
          "Each cat on the Adoption list. Foster and pet store come from that cat’s profile, not from a trap team.",
        columns: [
          { key: "label", label: "Cat" },
          { key: "sublabel", label: "Status" },
          { key: "extra.sex", label: "Sex" },
          { key: "extra.foster", label: "Foster" },
          { key: "extra.store", label: "Pet store" },
          { key: "extra.added", label: "Added" },
        ],
        rows,
        totals: [{ label: "Adoptable cats", value: rows.length }],
      };
    }

    case "adoption_applications_by_status": {
      const listed = filterAdoptionApplications(adoptionApplications, filters);
      const rows = ADOPTION_APPLICATION_STATUSES.map((entry) => {
        const matches = listed.filter((application) => application.status === entry.value);
        return {
          key: entry.value,
          label: entry.label,
          count: matches.length,
          sources: matches.map((application) => ({
            id: application.id,
            href: "/adoption/applications",
            title: application.applicantName || "Applicant",
            detail: [application.catInterestName, application.applicantEmail].filter(Boolean).join(" · ") || "Application",
          })),
        };
      }).filter((row) => row.count > 0);
      return {
        title: "Adoption applications by status",
        description: "Applications from people who want to adopt, grouped by review status.",
        columns: [
          { key: "label", label: "Status" },
          { key: "count", label: "Applications" },
        ],
        rows,
        totals: [{ label: "Applications", value: listed.length }],
      };
    }

    case "adoption_applications_detail": {
      const listed = filterAdoptionApplications(adoptionApplications, filters);
      const rows: ReportRow[] = listed.map((application) => ({
        key: application.id,
        label: application.applicantName || "—",
        sublabel: adoptionApplicationStatusLabel(application.status),
        count: 1,
        extra: {
          email: application.applicantEmail || "—",
          wrote: application.catInterestName || "—",
          linked: application.linkedCatName || "—",
          submitted: application.created_at.slice(0, 10),
        },
        sources: [
          {
            id: application.id,
            href: "/adoption/applications",
            title: application.applicantName || "Applicant",
            detail: [adoptionApplicationStatusLabel(application.status), application.catInterestName, application.applicantEmail]
              .filter(Boolean)
              .join(" · "),
          },
        ],
      }));
      return {
        title: "Adoption applications",
        description: "Each application from a person who wants to adopt a cat.",
        columns: [
          { key: "label", label: "Applicant" },
          { key: "sublabel", label: "Status" },
          { key: "extra.email", label: "Email" },
          { key: "extra.wrote", label: "Cat named on the form" },
          { key: "extra.linked", label: "Linked cat" },
          { key: "extra.submitted", label: "Submitted" },
        ],
        rows,
        totals: [{ label: "Applications", value: rows.length }],
      };
    }

    default:
      return {
        title: "Report",
        description: "",
        columns: [],
        rows: [],
        totals: [],
      };
  }
}

export function reportFilterOptions(
  helpRequests: ReportHelpRequest[],
  teams: ReportTrapTeam[],
  clinics: ReportClinic[]
) {
  const zips = Array.from(
    new Set(helpRequests.map((hr) => normalizeZip(hr.colony_zip)).filter(Boolean))
  ).sort();

  return {
    zips,
    teams: sortTrapTeams(
      teams.filter((team) => team.is_active !== false).map((team) => ({
        id: team.id,
        name: team.name,
      }))
    ),
    clinics: clinics
      .filter((clinic) => clinic.is_active !== false)
      .map((clinic) => ({ id: clinic.id, name: clinic.name })),
    statuses: reportCaseStatuses(),
  };
}
