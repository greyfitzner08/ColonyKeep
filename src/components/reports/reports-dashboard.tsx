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
  SelectItem,
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
import {
  isAppointmentTiedReportType,
  showAppointmentTiedReports,
} from "@/lib/reports/visibility";
import { cn } from "@/lib/utils";

type ReportGroupId = "queue_cats" | "inquiries_cases" | "tnvr_work" | "adoption";

const REPORT_GROUPS: { id: ReportGroupId; label: string; description: string }[] = [
  {
    id: "queue_cats",
    label: "Trap queue cats",
    description: "Open cases: remaining unfixed cats versus cats already TNR’d (clinic or public update).",
  },
  {
    id: "inquiries_cases",
    label: "Inquiries & cases",
    description: "Inquiry volume and trap-case caseload.",
  },
  {
    id: "tnvr_work",
    label: "Clinic & foster",
    description: "Where trap-case cats went for clinic or foster care.",
  },
  {
    id: "adoption",
    label: "Adoption",
    description: "Adoptable cats and applications. Not assigned to a trap team.",
  },
];

const REPORT_TYPES: { value: ReportType; label: string; hint: string; group: ReportGroupId }[] = [
  {
    value: "queue_cats_by_zip",
    label: "Remaining vs fixed by ZIP",
    hint: "Open-case cats still unfixed versus already TNR’d (clinic or public update), grouped by colony ZIP.",
    group: "queue_cats",
  },
  {
    value: "queue_cats_by_team",
    label: "Remaining vs fixed by team",
    hint: "Open-case cats still unfixed versus already TNR’d (clinic or public update), grouped by trap team.",
    group: "queue_cats",
  },
  {
    value: "queue_cats_by_month",
    label: "Remaining vs fixed by month",
    hint: "Open-case cats still unfixed versus already TNR’d (clinic or public update), grouped by the month the case was created.",
    group: "queue_cats",
  },
  {
    value: "inquiries_by_zip",
    label: "Inquiries by ZIP",
    hint: "How many inquiry forms came from each colony ZIP code.",
    group: "inquiries_cases",
  },
  {
    value: "inquiries_by_team",
    label: "Inquiries by team",
    hint: "Inquiry volume per trap team (assigned or ZIP-mapped).",
    group: "inquiries_cases",
  },
  {
    value: "cases_by_trapper",
    label: "Cases by trapper",
    hint: "Trap work grouped by trapper, trap loaner, or case worker.",
    group: "inquiries_cases",
  },
  {
    value: "cases_by_team",
    label: "Cases by team",
    hint: "Case volume per trap team including completed field work.",
    group: "inquiries_cases",
  },
  {
    value: "case_status_summary",
    label: "Cases by status",
    hint: "Status breakdown for the filtered case set.",
    group: "inquiries_cases",
  },
  {
    value: "case_detail",
    label: "Case detail list",
    hint: "Exportable row-level list of cases matching filters.",
    group: "inquiries_cases",
  },
  {
    value: "cats_by_clinic",
    label: "Cats by clinic",
    hint: "TNVR case cats linked to each clinic. Adoptable Cats are not included.",
    group: "tnvr_work",
  },
  {
    value: "cats_by_foster_facility",
    label: "TNVR foster totals",
    hint: "Trap-case cats sent to foster or a facility. Adoptable Cats are not included and have no trap team.",
    group: "tnvr_work",
  },
  {
    value: "foster_placements_detail",
    label: "TNVR foster detail",
    hint: "Each trap-case cat sent to foster or a facility, with that case’s trap team.",
    group: "tnvr_work",
  },
  {
    value: "clinic_usage",
    label: "Clinic appointments",
    hint: "Appointment counts per clinic in the filtered date range.",
    group: "tnvr_work",
  },
  {
    value: "adoptable_cats_by_status",
    label: "Adoptable cats by status",
    hint: "Cats on the Adoption list, grouped by status. Not assigned to a trap team.",
    group: "adoption",
  },
  {
    value: "adoptable_cats_detail",
    label: "Adoptable cats list",
    hint: "Each Adoptable Cat, with foster and pet store from that profile.",
    group: "adoption",
  },
  {
    value: "adoption_applications_by_status",
    label: "Applications by status",
    hint: "Adoption applications grouped by review status.",
    group: "adoption",
  },
  {
    value: "adoption_applications_detail",
    label: "Applications list",
    hint: "Each application from a person who wants to adopt.",
    group: "adoption",
  },
];

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
  const [setupOpen, setSetupOpen] = useState(false);

  const visibleReportTypes = useMemo(
    () =>
      REPORT_TYPES.filter(
        (entry) => showAppointmentTiedReports() || !isAppointmentTiedReportType(entry.value)
      ),
    []
  );

  useEffect(() => {
    if (visibleReportTypes.some((entry) => entry.value === reportType)) return;
    const fallback = visibleReportTypes[0];
    if (fallback) setReportType(fallback.value);
  }, [reportType, visibleReportTypes]);

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

  const activeReport =
    visibleReportTypes.find((entry) => entry.value === reportType) ??
    REPORT_TYPES.find((entry) => entry.value === reportType);

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

  function activeFilterCount() {
    let count = 0;
    if (filters.dateFrom) count += 1;
    if (filters.dateTo) count += 1;
    if (filters.status) count += 1;
    if (!adoptionReport) {
      if (filters.zip) count += 1;
      if (filters.teamId) count += 1;
      if (filters.clinicId) count += 1;
      if (filters.trapper.trim()) count += 1;
      if (filters.intakeOnly) count += 1;
    }
    return count;
  }

  return (
    <div className="space-y-6">
      <div className="print:hidden">
        <PageHeader
          title="Reports"
          description="Click a ready-made report, or build a custom pivot and export any table."
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
          <div className="flex justify-end">
            <Button variant="outline" onClick={exportReport} disabled={result.rows.length === 0}>
              <Download className="h-4 w-4 mr-2" />
              Export CSV
            </Button>
          </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-lg">Choose a report</CardTitle>
          <CardDescription>
            Click a report to run it. Use filters below only if you need a narrower slice.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          {REPORT_GROUPS.map((group) => {
            const entries = visibleReportTypes.filter((entry) => entry.group === group.id);
            if (entries.length === 0) return null;
            return (
              <div key={group.id} className="space-y-3">
                <div>
                  <p className="text-sm font-medium">{group.label}</p>
                  <p className="text-xs text-muted-foreground">{group.description}</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                  {entries.map((entry) => (
                    <button
                      key={entry.value}
                      type="button"
                      onClick={() => selectReportType(entry.value)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors",
                        reportType === entry.value
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <p className="font-medium text-sm">{entry.label}</p>
                      <p className="text-xs text-muted-foreground mt-1">{entry.hint}</p>
                    </button>
                  ))}
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      <Card>
        <CardHeader
          className="pb-3 cursor-pointer select-none"
          onClick={() => setSetupOpen((open) => !open)}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Filters
              </CardTitle>
              <CardDescription>
                {setupOpen
                  ? "Leave dates blank for all time. Status filter still applies to open-queue reports."
                  : `${activeReport?.label ?? "Remaining vs fixed by ZIP"}${
                      activeFilterCount() > 0 ? ` · ${activeFilterCount()} filter${activeFilterCount() === 1 ? "" : "s"} active` : " · all time"
                    }`}
              </CardDescription>
            </div>
            <ChevronDown
              className={cn(
                "h-5 w-5 shrink-0 text-muted-foreground transition-transform",
                setupOpen && "rotate-180"
              )}
            />
          </div>
        </CardHeader>
        {setupOpen && (
          <CardContent className="space-y-6">
            <div className="space-y-4">
              <div>
                <p className="text-sm font-medium">Narrow this report</p>
                <p className="text-xs text-muted-foreground">
                  {adoptionReport
                    ? "Narrow this Adoption report by date or status. Trap team, clinic, and ZIP filters apply to TNVR cases only."
                    : "Narrow results by date, location, team, clinic, trapper, or status."}
                </p>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
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
            {adoptionReport ? null : (
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
                onValueChange={(value) => updateFilter("teamId", value === "all" ? "" : value)}
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
            <div className="space-y-2">
              <Label>Clinic</Label>
              <Select
                value={filters.clinicId || "all"}
                onValueChange={(value) => updateFilter("clinicId", value === "all" ? "" : value)}
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
            </>
            )}
            <div className="space-y-2">
              <Label>{adoptionReport ? (reportType.startsWith("adoption_application") ? "Application status" : "Cat status") : "Case status"}</Label>
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
            {adoptionReport ? null : (
            <div className="flex items-end">
              <div className="flex items-center gap-2 rounded-md border px-3 py-2 w-full">
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
            )}
          </div>

              <div className="flex justify-end">
                <Button type="button" variant="ghost" size="sm" onClick={resetFilters}>
                  <RotateCcw className="h-4 w-4 mr-2" />
                  Reset filters
                </Button>
              </div>
            </div>
          </CardContent>
        )}
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{result.title}</CardTitle>
          <CardDescription>{activeReport?.hint ?? result.description}</CardDescription>
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
