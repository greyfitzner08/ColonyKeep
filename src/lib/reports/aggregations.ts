import { findTrapTeamForZip, normalizeZip } from "@/lib/cases/assign-team-by-zip";
import { fosterFacilityLabel, type FosterFacility } from "@/lib/cases/foster-facility";
import { CASE_STATUSES } from "@/lib/constants";
import { sortTrapTeams } from "@/lib/trap-teams/sort-teams";
import type { HelpRequestStatus } from "@/lib/types";

export interface ReportCat {
  id: string;
  help_request_id: string;
  clinic_id: string | null;
  clinic_name: string | null;
  trap_date: string | null;
  created_at: string;
  age_category: "adult" | "kitten" | null;
  went_to_foster_facility: boolean | null;
  foster_facility: FosterFacility | null;
  foster_facility_other: string | null;
}

export interface ReportClinicFix {
  id: string;
  help_request_id: string;
  cat_id: string | null;
  fix_date: string;
  clinic_name: string | null;
  age_category: "adult" | "kitten";
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
  contact_name: string;
  contact_email: string;
  colony_city: string;
  colony_county: string;
  colony_zip: string;
  kittens_under_8_weeks: number;
  cats_over_8_weeks: number;
  assigned_team_id: string | null;
  assigned_team_name: string | null;
  claimed_by_email: string | null;
  claimed_by_name: string | null;
  trapper_trap_loaner: string | null;
  created_at: string;
}

export type ReportType =
  | "inquiries_by_zip"
  | "inquiries_by_team"
  | "cases_by_trapper"
  | "cases_by_team"
  | "cats_by_clinic"
  | "cats_by_foster_facility"
  | "foster_placements_detail"
  | "clinic_usage"
  | "case_status_summary"
  | "case_detail";

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

export interface ReportRow {
  key: string;
  label: string;
  sublabel?: string;
  count: number;
  cats?: number;
  extra?: Record<string, string | number>;
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
  return (hr.kittens_under_8_weeks ?? 0) + (hr.cats_over_8_weeks ?? 0);
}

export function filterHelpRequests(
  requests: ReportHelpRequest[],
  filters: ReportFilters,
  teams: ReportTrapTeam[],
  options?: { skipDateFilter?: boolean }
): ReportHelpRequest[] {
  return requests.filter((hr) => {
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

function filterCats(cats: ReportCat[], filters: ReportFilters, requestIds: Set<string>): ReportCat[] {
  return cats.filter((cat) => {
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
  requestIds: Set<string>
): ReportAppointment[] {
  return appointments.filter((appt) => {
    if (requestIds.size > 0 && appt.help_request_id && !requestIds.has(appt.help_request_id)) {
      return false;
    }
    if (filters.clinicId && appt.clinic_id !== filters.clinicId) return false;
    if (!inDateRange(appt.date, filters.dateFrom, filters.dateTo)) return false;
    return true;
  });
}

function groupCount(
  items: { key: string; label: string; sublabel?: string; cats?: number }[]
): ReportRow[] {
  const map = new Map<string, ReportRow>();
  for (const item of items) {
    const existing = map.get(item.key);
    if (existing) {
      existing.count += 1;
      existing.cats = (existing.cats ?? 0) + (item.cats ?? 0);
    } else {
      map.set(item.key, {
        key: item.key,
        label: item.label,
        sublabel: item.sublabel,
        count: 1,
        cats: item.cats ?? 0,
      });
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

function filterClinicFixes(
  fixes: ReportClinicFix[],
  filters: ReportFilters,
  requestIds: Set<string>,
  clinics: ReportClinic[]
): ReportClinicFix[] {
  const selectedClinicName = filters.clinicId
    ? clinics.find((clinic) => clinic.id === filters.clinicId)?.name?.trim()
    : null;

  return fixes.filter((fix) => {
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
  source: "clinic_fix" | "tracked_cat";
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
  clinics: ReportClinic[]
): FosterPlacement[] {
  const filteredFixes = filterClinicFixes(clinicFixes, filters, requestIds, clinics);
  const filteredCats = filterCats(cats, filters, requestIds);
  const placements: FosterPlacement[] = [];
  const catIdsFromFixes = new Set<string>();

  for (const fix of filteredFixes) {
    if (!fix.went_to_foster_facility) continue;
    if (fix.cat_id) catIdsFromFixes.add(fix.cat_id);
    placements.push({
      key: `fix:${fix.id}`,
      helpRequestId: fix.help_request_id,
      catId: fix.cat_id,
      facilityLabel: fosterPlacementLabel(fix.foster_facility, fix.foster_facility_other),
      ageCategory: fix.age_category,
      placementDate: fix.fix_date,
      source: "clinic_fix",
    });
  }

  for (const cat of filteredCats) {
    if (cat.went_to_foster_facility !== true) continue;
    if (catIdsFromFixes.has(cat.id)) continue;
    placements.push({
      key: `cat:${cat.id}`,
      helpRequestId: cat.help_request_id,
      catId: cat.id,
      facilityLabel: fosterPlacementLabel(cat.foster_facility, cat.foster_facility_other),
      ageCategory: cat.age_category ?? "—",
      placementDate: cat.trap_date ?? cat.created_at,
      source: "tracked_cat",
    });
  }

  return placements.sort((a, b) => b.placementDate.localeCompare(a.placementDate));
}

export function runReport(
  type: ReportType,
  filters: ReportFilters,
  helpRequests: ReportHelpRequest[],
  cats: ReportCat[],
  appointments: ReportAppointment[],
  teams: ReportTrapTeam[],
  _clinics: ReportClinic[],
  clinicFixes: ReportClinicFix[] = []
): ReportResult {
  const filtered = filterHelpRequests(helpRequests, filters, teams);
  const requestIds = new Set(filtered.map((hr) => hr.id));
  const fosterRequestIds = new Set(
    filterHelpRequests(helpRequests, filters, teams, { skipDateFilter: true }).map((hr) => hr.id)
  );
  const filteredCats = filterCats(cats, filters, requestIds);
  const filteredAppointments = filterAppointments(appointments, filters, requestIds);
  const fosterPlacements = collectFosterPlacements(
    clinicFixes,
    cats,
    filters,
    fosterRequestIds,
    _clinics
  );
  const caseById = new Map(helpRequests.map((hr) => [hr.id, hr]));

  switch (type) {
    case "inquiries_by_zip": {
      const rows = groupCount(
        filtered.map((hr) => ({
          key: normalizeZip(hr.colony_zip) || "unknown",
          label: normalizeZip(hr.colony_zip) || "Unknown ZIP",
          sublabel: hr.colony_county || undefined,
          cats: catCount(hr),
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
      const rows = groupCount(
        filteredCats.map((cat) => ({
          key: cat.clinic_id ?? "unknown",
          label: cat.clinic_name?.trim() || "No clinic recorded",
          cats: 1,
        }))
      );
      return {
        title: "Cats by clinic",
        description: "Cats with clinic assignments in the filtered date range.",
        columns: [
          { key: "label", label: "Clinic" },
          { key: "count", label: "Cats" },
        ],
        rows,
        totals: [{ label: "Cats", value: filteredCats.length }],
      };
    }

    case "cats_by_foster_facility": {
      const rows = groupCount(
        fosterPlacements.map((placement) => ({
          key: placement.facilityLabel.toLowerCase(),
          label: placement.facilityLabel,
          cats: 1,
        }))
      );
      const adults = fosterPlacements.filter((p) => p.ageCategory === "adult").length;
      const kittens = fosterPlacements.filter((p) => p.ageCategory === "kitten").length;
      return {
        title: "Cats sent to foster / facility",
        description:
          "Cats recorded as going to foster or a facility, grouped by destination. Includes clinic fixes and tracked cats not yet linked to a fix.",
        columns: [
          { key: "label", label: "Foster / facility" },
          { key: "count", label: "Cats" },
        ],
        rows,
        totals: [
          { label: "Total sent to foster/facility", value: fosterPlacements.length },
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
            source: placement.source === "clinic_fix" ? "Clinic fix" : "Tracked cat",
          },
        };
      });
      return {
        title: "Foster / facility placement detail",
        description: "One row per cat sent to foster or a facility, matching current filters.",
        columns: [
          { key: "label", label: "Case #" },
          { key: "sublabel", label: "Foster / facility" },
          { key: "extra.age", label: "Age" },
          { key: "extra.date", label: "Date" },
          { key: "extra.zip", label: "ZIP" },
          { key: "extra.team", label: "Team" },
          { key: "extra.source", label: "Source" },
        ],
        rows,
        totals: [{ label: "Cats sent to foster/facility", value: rows.length }],
      };
    }

    case "clinic_usage": {
      const rows = groupCount(
        filteredAppointments.map((appt) => ({
          key: appt.clinic_id,
          label: appt.clinic_name,
        }))
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
      const rows = CASE_STATUSES.map((entry) => ({
        key: entry.value,
        label: entry.label,
        count: filtered.filter((hr) => hr.status === entry.value).length,
      })).filter((row) => row.count > 0);
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
        };
      });
      return {
        title: "Case detail export",
        description: "Row-level case list matching current filters.",
        columns: [
          { key: "label", label: "Case #" },
          { key: "sublabel", label: "Contact" },
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
    statuses: CASE_STATUSES,
  };
}
