"use client";

import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Download, Filter, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PageHeader } from "@/components/layout/page-header";
import { PivotReportBuilder } from "@/components/reports/pivot-report-builder";
import { TableExportPanel } from "@/components/reports/table-export-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  DEFAULT_REPORT_FILTERS,
  type ReportAdoptableCat,
  type ReportAdoptionApplication,
  type ReportAppointment,
  type ReportCat,
  type ReportClinic,
  type ReportClinicFix,
  type ReportFilters,
  type ReportHelpRequest,
  type ReportTrapTeam,
  type ReportType,
  isAdoptionProgramReport,
  reportFilterOptions,
  runReport,
} from "@/lib/reports/aggregations";
import { ADOPTABLE_CAT_STATUSES } from "@/lib/adoption/constants";
import { ADOPTION_APPLICATION_STATUSES } from "@/lib/adoption/application";
import { downloadCsv, reportToCsv } from "@/lib/reports/export-csv";
import { showAppointmentTiedReports } from "@/lib/reports/visibility";
import { cn } from "@/lib/utils";

type ReportFamilyId =
  | "remaining_vs_fixed"
  | "inquiries"
  | "cases"
  | "cats_by_clinic"
  | "tnvr_foster"
  | "clinic_usage"
  | "adoptable_cats"
  | "adoption_applications";

type ReportBreakdown =
  | "zip"
  | "team"
  | "month"
  | "trapper"
  | "status"
  | "clinic"
  | "totals"
  | "detail";

interface ReportBreakdownOption {
  value: ReportBreakdown;
  label: string;
  type: ReportType;
  hint: string;
}

interface ReportFamily {
  id: ReportFamilyId;
  label: string;
  group: string;
  hint: string;
  appointmentTied?: boolean;
  breakdowns: ReportBreakdownOption[];
}

const REPORT_FAMILIES: ReportFamily[] = [
  {
    id: "remaining_vs_fixed",
    label: "Remaining vs fixed",
    group: "Trap queue",
    hint: "Open-case cats still unfixed versus already TNR’d (clinic or public update).",
    breakdowns: [
      {
        value: "zip",
        label: "ZIP",
        type: "queue_cats_by_zip",
        hint: "Grouped by colony ZIP.",
      },
      {
        value: "team",
        label: "Team",
        type: "queue_cats_by_team",
        hint: "Grouped by trap team.",
      },
      {
        value: "month",
        label: "Month",
        type: "queue_cats_by_month",
        hint: "Grouped by the month the case was created.",
      },
    ],
  },
  {
    id: "inquiries",
    label: "Inquiries",
    group: "Inquiries & cases",
    hint: "How many inquiry forms came in.",
    breakdowns: [
      {
        value: "zip",
        label: "ZIP",
        type: "inquiries_by_zip",
        hint: "Grouped by colony ZIP.",
      },
      {
        value: "team",
        label: "Team",
        type: "inquiries_by_team",
        hint: "Grouped by trap team (assigned or ZIP-mapped).",
      },
    ],
  },
  {
    id: "cases",
    label: "Cases",
    group: "Inquiries & cases",
    hint: "Trap-case volume and caseload.",
    breakdowns: [
      {
        value: "team",
        label: "Team",
        type: "cases_by_team",
        hint: "Case volume per trap team.",
      },
      {
        value: "trapper",
        label: "Trapper",
        type: "cases_by_trapper",
        hint: "Grouped by trapper, trap loaner, or case worker.",
      },
      {
        value: "status",
        label: "Status",
        type: "case_status_summary",
        hint: "Status breakdown for the filtered cases.",
      },
      {
        value: "detail",
        label: "List",
        type: "case_detail",
        hint: "One row per matching case.",
      },
    ],
  },
  {
    id: "cats_by_clinic",
    label: "Cats by clinic",
    group: "Clinic & foster",
    hint: "TNVR case cats linked to each clinic. Adoptable cats are not included.",
    breakdowns: [
      {
        value: "clinic",
        label: "Clinic",
        type: "cats_by_clinic",
        hint: "TNVR case cats linked to each clinic.",
      },
    ],
  },
  {
    id: "tnvr_foster",
    label: "TNVR foster",
    group: "Clinic & foster",
    hint: "Trap-case cats sent to foster or a facility.",
    breakdowns: [
      {
        value: "totals",
        label: "Totals",
        type: "cats_by_foster_facility",
        hint: "Totals by foster or facility.",
      },
      {
        value: "detail",
        label: "List",
        type: "foster_placements_detail",
        hint: "One row per trap-case cat sent to foster or a facility.",
      },
    ],
  },
  {
    id: "clinic_usage",
    label: "Clinic appointments",
    group: "Clinic & foster",
    hint: "Appointment counts per clinic in the filtered date range.",
    appointmentTied: true,
    breakdowns: [
      {
        value: "clinic",
        label: "Clinic",
        type: "clinic_usage",
        hint: "Appointment counts per clinic.",
      },
    ],
  },
  {
    id: "adoptable_cats",
    label: "Adoptable cats",
    group: "Adoption",
    hint: "Cats on the Adoption list. Not assigned to a trap team.",
    breakdowns: [
      {
        value: "status",
        label: "Status",
        type: "adoptable_cats_by_status",
        hint: "Grouped by adoptable-cat status.",
      },
      {
        value: "detail",
        label: "List",
        type: "adoptable_cats_detail",
        hint: "One row per adoptable cat, with foster and pet store.",
      },
    ],
  },
  {
    id: "adoption_applications",
    label: "Adoption applications",
    group: "Adoption",
    hint: "People who applied to adopt.",
    breakdowns: [
      {
        value: "status",
        label: "Status",
        type: "adoption_applications_by_status",
        hint: "Grouped by application review status.",
      },
      {
        value: "detail",
        label: "List",
        type: "adoption_applications_detail",
        hint: "One row per application.",
      },
    ],
  },
];

function familyMatchesType(family: ReportFamily, type: ReportType) {
  return family.breakdowns.some((entry) => entry.type === type);
}

function breakdownForType(family: ReportFamily, type: ReportType) {
  return family.breakdowns.find((entry) => entry.type === type) ?? family.breakdowns[0];
}

interface ReportsDashboardProps {
  helpRequests: ReportHelpRequest[];
  cats: ReportCat[];
  clinicFixes: ReportClinicFix[];
  appointments: ReportAppointment[];
  teams: ReportTrapTeam[];
  clinics: ReportClinic[];
  adoptableCats: ReportAdoptableCat[];
  adoptionApplications: ReportAdoptionApplication[];
}

function cellValue(
  row: ReturnType<typeof runReport>["rows"][number],
  columnKey: string
): string {
  if (columnKey.startsWith("extra.")) {
    const field = columnKey.slice("extra.".length);
    return String(row.extra?.[field] ?? "—");
  }
  if (columnKey === "cats") return String(row.cats ?? 0);
  if (columnKey === "count") return String(row.count);
  const value = row[columnKey as keyof typeof row];
  return value == null || value === "" ? "—" : String(value);
}

export function ReportsDashboard({
  helpRequests,
  cats,
  clinicFixes,
  appointments,
  teams,
  clinics,
  adoptableCats,
  adoptionApplications,
}: ReportsDashboardProps) {
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);
  const [reportType, setReportType] = useState<ReportType>("queue_cats_by_zip");
  const [moreFiltersOpen, setMoreFiltersOpen] = useState(false);

  const visibleFamilies = useMemo(
    () =>
      REPORT_FAMILIES.filter(
        (family) => showAppointmentTiedReports() || !family.appointmentTied
      ),
    []
  );

  const familyGroups = useMemo(() => {
    const groups: { label: string; families: ReportFamily[] }[] = [];
    for (const family of visibleFamilies) {
      const existing = groups.find((group) => group.label === family.group);
      if (existing) existing.families.push(family);
      else groups.push({ label: family.group, families: [family] });
    }
    return groups;
  }, [visibleFamilies]);

  const activeFamily =
    visibleFamilies.find((family) => familyMatchesType(family, reportType)) ??
    visibleFamilies[0];
  const activeBreakdown = activeFamily
    ? breakdownForType(activeFamily, reportType)
    : undefined;

  useEffect(() => {
    if (visibleFamilies.some((family) => familyMatchesType(family, reportType))) return;
    const fallback = visibleFamilies[0]?.breakdowns[0];
    if (fallback) setReportType(fallback.type);
  }, [reportType, visibleFamilies]);

  const options = useMemo(
    () => reportFilterOptions(helpRequests, teams, clinics),
    [helpRequests, teams, clinics]
  );

  const result = useMemo(
    () =>
      runReport(
        reportType,
        filters,
        helpRequests,
        cats,
        appointments,
        teams,
        clinics,
        clinicFixes,
        adoptableCats,
        adoptionApplications
      ),
    [
      reportType,
      filters,
      helpRequests,
      cats,
      appointments,
      teams,
      clinics,
      clinicFixes,
      adoptableCats,
      adoptionApplications,
    ]
  );

  const reportTableColumns = useMemo((): DataTableColumn<(typeof result.rows)[number]>[] => {
    return result.columns.map((column) => ({
      id: column.key,
      label: column.label,
      defaultWidth:
        column.key === "count" ||
        column.key === "cats" ||
        column.key === "extra.remaining" ||
        column.key === "extra.fixed"
          ? 110
          : 180,
      render: (row) => cellValue(row, column.key),
      sortValue: (row) => {
        if (column.key.startsWith("extra.")) {
          const field = column.key.slice("extra.".length);
          return row.extra?.[field] ?? null;
        }
        if (column.key === "cats") return row.cats ?? 0;
        if (column.key === "count") return row.count;
        const value = row[column.key as keyof typeof row];
        if (typeof value === "number") return value;
        if (value == null || value === "") return null;
        return String(value);
      },
    }));
  }, [result.columns]);

  function updateFilter<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

  function selectReportType(next: ReportType) {
    setReportType(next);
    setFilters((current) => {
      const allowed = isAdoptionProgramReport(next)
        ? next.startsWith("adoption_application")
          ? ADOPTION_APPLICATION_STATUSES
          : ADOPTABLE_CAT_STATUSES
        : options.statuses;
      if (current.status && !allowed.some((entry) => entry.value === current.status)) {
        return { ...current, status: "" };
      }
      return current;
    });
  }

  function selectFamily(familyId: ReportFamilyId) {
    const family = visibleFamilies.find((entry) => entry.id === familyId);
    if (!family) return;
    const currentBreakdown = activeBreakdown?.value;
    const next =
      family.breakdowns.find((entry) => entry.value === currentBreakdown) ?? family.breakdowns[0];
    if (next) selectReportType(next.type);
  }

  function selectBreakdown(value: ReportBreakdown) {
    const next = activeFamily?.breakdowns.find((entry) => entry.value === value);
    if (next) selectReportType(next.type);
  }

  const adoptionReport = isAdoptionProgramReport(reportType);
  const statusOptions = adoptionReport
    ? reportType.startsWith("adoption_application")
      ? ADOPTION_APPLICATION_STATUSES
      : ADOPTABLE_CAT_STATUSES
    : options.statuses;

  function resetFilters() {
    setFilters(DEFAULT_REPORT_FILTERS);
  }

  function exportReport() {
    const slug = reportType.replace(/_/g, "-");
    downloadCsv(`tnvr-report-${slug}.csv`, reportToCsv(result));
  }

  const extraCriteria = adoptionReport
    ? 0
    : [filters.clinicId, filters.trapper.trim(), filters.status, filters.intakeOnly].filter(Boolean)
        .length;

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Reports"
          description="Run a quick report with criteria, or open the pivot builder for a custom table."
        />
      </div>

      <Tabs defaultValue="quick" className="space-y-4 print:block">
        <TabsList className="print:hidden grid h-auto w-full grid-cols-1 gap-1 sm:grid-cols-3">
          <TabsTrigger value="quick">Quick reports</TabsTrigger>
          <TabsTrigger value="pivot">Pivot builder</TabsTrigger>
          <TabsTrigger value="table-export">Table export</TabsTrigger>
        </TabsList>

        <TabsContent value="pivot" className="mt-0 space-y-4">
          <PivotReportBuilder
            helpRequests={helpRequests}
            cats={cats}
            clinicFixes={clinicFixes}
            appointments={appointments}
            teams={teams}
            clinics={clinics}
          />
        </TabsContent>

        <TabsContent value="table-export" className="mt-0 space-y-4 print:hidden">
          <TableExportPanel />
        </TabsContent>

        <TabsContent value="quick" className="mt-0 space-y-4 print:hidden">
      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <CardTitle className="text-lg">Quick report</CardTitle>
              <CardDescription>
                Choose what to measure, how to break it down, then set criteria. Leave dates blank
                for all time.
              </CardDescription>
            </div>
            <Button
              variant="outline"
              onClick={exportReport}
              disabled={result.rows.length === 0}
              className="shrink-0"
            >
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,20rem)_1fr]">
            <div className="space-y-2">
              <Label htmlFor="quick-report-family">Report</Label>
              <Select
                value={activeFamily?.id}
                onValueChange={(value) => selectFamily(value as ReportFamilyId)}
              >
                <SelectTrigger id="quick-report-family">
                  <SelectValue placeholder="Choose a report" />
                </SelectTrigger>
                <SelectContent>
                  {familyGroups.map((group) => (
                    <SelectGroup key={group.label}>
                      <SelectLabel>{group.label}</SelectLabel>
                      {group.families.map((family) => (
                        <SelectItem key={family.id} value={family.id}>
                          {family.label}
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  ))}
                </SelectContent>
              </Select>
              {activeFamily ? (
                <p className="text-xs text-muted-foreground">{activeFamily.hint}</p>
              ) : null}
            </div>
            {activeFamily && activeFamily.breakdowns.length > 1 ? (
              <div className="space-y-2">
                <Label>Break down by</Label>
                <div
                  className="flex flex-wrap gap-2"
                  role="group"
                  aria-label="Break down by"
                >
                  {activeFamily.breakdowns.map((entry) => (
                    <Button
                      key={entry.value}
                      type="button"
                      size="sm"
                      variant={activeBreakdown?.value === entry.value ? "default" : "outline"}
                      onClick={() => selectBreakdown(entry.value)}
                    >
                      {entry.label}
                    </Button>
                  ))}
                </div>
                {activeBreakdown ? (
                  <p className="text-xs text-muted-foreground">{activeBreakdown.hint}</p>
                ) : null}
              </div>
            ) : null}
          </div>

          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-medium">Criteria</p>
              <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
            </div>
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
              <div className="space-y-2">
                <Label htmlFor="report-date-from">From date</Label>
                <Input
                  id="report-date-from"
                  type="date"
                  value={filters.dateFrom}
                  onChange={(event) => updateFilter("dateFrom", event.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="report-date-to">To date</Label>
                <Input
                  id="report-date-to"
                  type="date"
                  value={filters.dateTo}
                  onChange={(event) => updateFilter("dateTo", event.target.value)}
                />
              </div>
              {adoptionReport ? (
                <div className="space-y-2">
                  <Label>
                    {reportType.startsWith("adoption_application")
                      ? "Application status"
                      : "Cat status"}
                  </Label>
                  <Select
                    value={filters.status || "all"}
                    onValueChange={(value) => updateFilter("status", value === "all" ? "" : value)}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="All statuses" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All statuses</SelectItem>
                      {statusOptions.map((status) => (
                        <SelectItem key={status.value} value={status.value}>
                          {status.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label>ZIP code</Label>
                    <Select
                      value={filters.zip || "all"}
                      onValueChange={(value) => updateFilter("zip", value === "all" ? "" : value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All ZIP codes" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All ZIP codes</SelectItem>
                        {options.zips.map((zip) => (
                          <SelectItem key={zip} value={zip}>
                            {zip}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Trap team</Label>
                    <Select
                      value={filters.teamId || "all"}
                      onValueChange={(value) =>
                        updateFilter("teamId", value === "all" ? "" : value)
                      }
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="All teams" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All teams</SelectItem>
                        {options.teams.map((team) => (
                          <SelectItem key={team.id} value={team.id}>
                            {team.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </>
              )}
            </div>

            {adoptionReport ? null : (
            <div>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="-ml-2"
                onClick={() => setMoreFiltersOpen((open) => !open)}
                aria-expanded={moreFiltersOpen}
              >
                <Filter className="h-4 w-4 mr-2" />
                More criteria
                {extraCriteria > 0 ? (
                  <span className="ml-2 text-xs text-muted-foreground">
                    {extraCriteria} extra
                  </span>
                ) : null}
                <ChevronDown
                  className={cn(
                    "ml-1 h-4 w-4 text-muted-foreground transition-transform",
                    moreFiltersOpen && "rotate-180"
                  )}
                />
              </Button>
            </div>
            )}

            {moreFiltersOpen && !adoptionReport ? (
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
                    <div className="space-y-2">
                      <Label>Clinic</Label>
                      <Select
                        value={filters.clinicId || "all"}
                        onValueChange={(value) =>
                          updateFilter("clinicId", value === "all" ? "" : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All clinics" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All clinics</SelectItem>
                          {options.clinics.map((clinic) => (
                            <SelectItem key={clinic.id} value={clinic.id}>
                              {clinic.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="report-trapper">Trapper / worker</Label>
                      <Input
                        id="report-trapper"
                        placeholder="Search trapper name or email"
                        value={filters.trapper}
                        onChange={(event) => updateFilter("trapper", event.target.value)}
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Case status</Label>
                      <Select
                        value={filters.status || "all"}
                        onValueChange={(value) =>
                          updateFilter("status", value === "all" ? "" : value)
                        }
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="All statuses" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="all">All statuses</SelectItem>
                          {statusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-end">
                      <div className="flex w-full items-center gap-2 rounded-md border px-3 py-2">
                        <Checkbox
                          id="report-intake-only"
                          checked={filters.intakeOnly}
                          onCheckedChange={(value) => updateFilter("intakeOnly", !!value)}
                        />
                        <Label htmlFor="report-intake-only" className="text-sm font-normal">
                          New inquiry forms only
                        </Label>
                      </div>
                    </div>
              </div>
            ) : null}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{result.title}</CardTitle>
          <CardDescription>
            {activeFamily
              ? `${activeFamily.hint}${activeBreakdown ? ` ${activeBreakdown.hint}` : ""}`
              : result.description}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-4">
            {result.totals.map((total) => (
              <div key={total.label} className="rounded-lg border px-4 py-3 min-w-[120px]">
                <p className="text-xs text-muted-foreground">{total.label}</p>
                <p className="text-2xl font-semibold">{total.value}</p>
              </div>
            ))}
          </div>

          <DataTable
            tableId={`reports-${reportType}`}
            columns={reportTableColumns}
            rows={result.rows}
            getRowKey={(row) => row.key}
            getSearchText={(row) =>
              result.columns.map((column) => String(cellValue(row, column.key) ?? "")).join(" ")
            }
            searchPlaceholder="Search report…"
            emptyMessage="No rows match the current filters."
          />
        </CardContent>
      </Card>
        </TabsContent>

      </Tabs>
    </div>
  );
}
