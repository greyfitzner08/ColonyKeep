"use client";

import { useMemo, useState } from "react";
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
import { NewsletterSignupPanel } from "@/components/reports/newsletter-signup-panel";
import { DataTable, type DataTableColumn } from "@/components/ui/data-table";
import {
  DEFAULT_REPORT_FILTERS,
  type ReportAppointment,
  type ReportCat,
  type ReportClinic,
  type ReportClinicFix,
  type ReportFilters,
  type ReportHelpRequest,
  type ReportTrapTeam,
  type ReportType,
  reportFilterOptions,
  runReport,
} from "@/lib/reports/aggregations";
import { downloadCsv, reportToCsv } from "@/lib/reports/export-csv";
import { cn } from "@/lib/utils";

const REPORT_TYPES: { value: ReportType; label: string; hint: string }[] = [
  {
    value: "inquiries_by_zip",
    label: "Inquiries by ZIP",
    hint: "How many inquiry forms came from each colony ZIP code.",
  },
  {
    value: "inquiries_by_team",
    label: "Inquiries by team",
    hint: "Inquiry volume per trap team (assigned or ZIP-mapped).",
  },
  {
    value: "cases_by_trapper",
    label: "Cases by trapper",
    hint: "Trap work grouped by trapper, trap loaner, or case worker.",
  },
  {
    value: "cases_by_team",
    label: "Cases by team",
    hint: "Case volume per trap team including completed field work.",
  },
  {
    value: "cats_by_clinic",
    label: "Cats by clinic",
    hint: "Cats linked to each clinic in the filtered period.",
  },
  {
    value: "cats_by_foster_facility",
    label: "Foster / facility totals",
    hint: "How many cats went to foster or a facility, grouped by destination.",
  },
  {
    value: "foster_placements_detail",
    label: "Foster / facility detail",
    hint: "Row-level list of each cat sent to foster or a facility.",
  },
  {
    value: "clinic_usage",
    label: "Clinic appointments",
    hint: "Appointment counts per clinic in the filtered date range.",
  },
  {
    value: "case_status_summary",
    label: "Cases by status",
    hint: "Status breakdown for the filtered case set.",
  },
  {
    value: "case_detail",
    label: "Case detail list",
    hint: "Exportable row-level list of cases matching filters.",
  },
];

interface NewsletterSignupRow {
  id: string;
  case_number: string | null;
  contact_name: string;
  contact_email: string;
  created_at: string;
  newsletter_list_added_at: string | null;
}

interface ReportsDashboardProps {
  helpRequests: ReportHelpRequest[];
  cats: ReportCat[];
  clinicFixes: ReportClinicFix[];
  appointments: ReportAppointment[];
  teams: ReportTrapTeam[];
  clinics: ReportClinic[];
  newsletterSignups: NewsletterSignupRow[];
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
  newsletterSignups,
}: ReportsDashboardProps) {
  const [filters, setFilters] = useState<ReportFilters>(DEFAULT_REPORT_FILTERS);
  const [reportType, setReportType] = useState<ReportType>("inquiries_by_zip");
  const [setupOpen, setSetupOpen] = useState(false);

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
        clinicFixes
      ),
    [reportType, filters, helpRequests, cats, appointments, teams, clinics, clinicFixes]
  );

  const activeReport = REPORT_TYPES.find((entry) => entry.value === reportType);

  const reportTableColumns = useMemo((): DataTableColumn<(typeof result.rows)[number]>[] => {
    return result.columns.map((column) => ({
      id: column.key,
      label: column.label,
      defaultWidth: column.key === "count" || column.key === "cats" ? 100 : 180,
      render: (row) => cellValue(row, column.key),
    }));
  }, [result.columns]);

  function updateFilter<K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) {
    setFilters((current) => ({ ...current, [key]: value }));
  }

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
    if (filters.zip) count += 1;
    if (filters.teamId) count += 1;
    if (filters.clinicId) count += 1;
    if (filters.trapper.trim()) count += 1;
    if (filters.status) count += 1;
    if (filters.intakeOnly) count += 1;
    return count;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div>
          <h1 className="text-3xl font-bold">Reports</h1>
          <p className="text-muted-foreground">
            Custom reports by ZIP, trap team, clinic, trapper, and date range.
          </p>
        </div>
        <Button variant="outline" onClick={exportReport} disabled={result.rows.length === 0}>
          <Download className="h-4 w-4 mr-2" />
          Export CSV
        </Button>
      </div>

      <Card>
        <CardHeader
          className="pb-3 cursor-pointer select-none"
          onClick={() => setSetupOpen((open) => !open)}
        >
          <div className="flex items-start justify-between gap-3">
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                <Filter className="h-4 w-4" />
                Report setup
              </CardTitle>
              <CardDescription>
                {setupOpen
                  ? "Choose a report type and refine with filters. Leave dates blank for all time."
                  : `${activeReport?.label ?? "Inquiries by ZIP"}${
                      activeFilterCount() > 0 ? ` · ${activeFilterCount()} filter${activeFilterCount() === 1 ? "" : "s"} active` : ""
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
            <div className="space-y-3">
              <div>
                <p className="text-sm font-medium">Report type</p>
                <p className="text-xs text-muted-foreground">Choose which report to run.</p>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
                {REPORT_TYPES.map((entry) => (
                  <button
                    key={entry.value}
                    type="button"
                    onClick={() => setReportType(entry.value)}
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

            <div className="space-y-4 border-t pt-6">
              <div>
                <p className="text-sm font-medium">Filters</p>
                <p className="text-xs text-muted-foreground">
                  Narrow results by date, location, team, clinic, trapper, or status.
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
            <div className="space-y-2">
              <Label>Case status</Label>
              <Select
                value={filters.status || "all"}
                onValueChange={(value) => updateFilter("status", value === "all" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All statuses" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All statuses</SelectItem>
                  {options.statuses.map((status) => (
                    <SelectItem key={status.value} value={status.value}>
                      {status.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
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
            emptyMessage="No rows match the current filters."
          />
        </CardContent>
      </Card>

      <NewsletterSignupPanel signups={newsletterSignups} />
    </div>
  );
}
