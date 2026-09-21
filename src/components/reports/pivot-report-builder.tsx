"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Download,
  Loader2,
  Printer,
  Save,
  Trash2,
  Table2,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { downloadCsv } from "@/lib/reports/export-csv";
import {
  DEFAULT_PIVOT_CONFIG,
  PIVOT_DATASETS,
  dimensionLabel,
  dimensionsForDataset,
  formatPivotKey,
  measuresForDataset,
  pivotToCsv,
  runPivot,
  sanitizePivotConfig,
  type PivotConfig,
  type PivotDataset,
  type PivotDimension,
  type PivotMeasure,
} from "@/lib/reports/pivot";
import type {
  ReportAppointment,
  ReportCat,
  ReportClinic,
  ReportClinicFix,
  ReportHelpRequest,
  ReportTrapTeam,
} from "@/lib/reports/aggregations";
import { reportFilterOptions } from "@/lib/reports/aggregations";
import { cn } from "@/lib/utils";

interface SavedReportRow {
  id: string;
  name: string;
  description: string | null;
  config: unknown;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

interface PivotReportBuilderProps {
  helpRequests: ReportHelpRequest[];
  cats: ReportCat[];
  clinicFixes: ReportClinicFix[];
  appointments: ReportAppointment[];
  teams: ReportTrapTeam[];
  clinics: ReportClinic[];
}

function DimensionSelect({
  id,
  label,
  value,
  options,
  allowNone,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  options: { value: PivotDimension; label: string }[];
  allowNone?: boolean;
  onChange: (value: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id} className="text-xs font-medium text-muted-foreground">
        {label}
      </Label>
      <Select value={value || "none"} onValueChange={(next) => onChange(next === "none" ? "" : next)}>
        <SelectTrigger id={id} className="h-9 w-full">
          <SelectValue placeholder={label} />
        </SelectTrigger>
        <SelectContent>
          {allowNone ? <SelectItem value="none">None</SelectItem> : null}
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}

export function PivotReportBuilder({
  helpRequests,
  cats,
  clinicFixes,
  appointments,
  teams,
  clinics,
}: PivotReportBuilderProps) {
  const [config, setConfig] = useState<PivotConfig>(DEFAULT_PIVOT_CONFIG);
  const [savedReports, setSavedReports] = useState<SavedReportRow[]>([]);
  const [selectedSavedId, setSelectedSavedId] = useState<string>("");
  const [loadingSaved, setLoadingSaved] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [storageMode, setStorageMode] = useState<"database" | "unavailable">("database");

  const filterOptions = useMemo(
    () => reportFilterOptions(helpRequests, teams, clinics),
    [helpRequests, teams, clinics]
  );

  const dimensionOptions = useMemo(
    () => dimensionsForDataset(config.dataset),
    [config.dataset]
  );
  const measureOptions = useMemo(() => measuresForDataset(config.dataset), [config.dataset]);

  const result = useMemo(
    () =>
      runPivot({
        config,
        helpRequests,
        cats,
        appointments,
        clinicFixes,
        teams,
      }),
    [config, helpRequests, cats, appointments, clinicFixes, teams]
  );

  useEffect(() => {
    let cancelled = false;
    async function loadSaved() {
      setLoadingSaved(true);
      setError(null);
      try {
        const response = await fetch("/api/reports/saved");
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
          if (!cancelled) {
            setStorageMode("unavailable");
            setSavedReports([]);
            if (payload?.code === "42P01") {
              setMessage(
                "Saved reports table is not installed yet. You can still build, export, and print pivots."
              );
            }
          }
          return;
        }
        if (!cancelled) {
          setStorageMode("database");
          setSavedReports(payload?.reports ?? []);
        }
      } catch {
        if (!cancelled) {
          setStorageMode("unavailable");
          setSavedReports([]);
        }
      } finally {
        if (!cancelled) setLoadingSaved(false);
      }
    }
    void loadSaved();
    return () => {
      cancelled = true;
    };
  }, []);

  function updateConfig(patch: Partial<PivotConfig>) {
    setConfig((current) => ({ ...current, ...patch }));
    setSelectedSavedId("");
    setMessage(null);
    setError(null);
  }

  function updateFilters(patch: Partial<PivotConfig["filters"]>) {
    setConfig((current) => ({
      ...current,
      filters: { ...current.filters, ...patch },
    }));
    setSelectedSavedId("");
  }

  function changeDataset(dataset: PivotDataset) {
    const dims = dimensionsForDataset(dataset).map((entry) => entry.value);
    const measures = measuresForDataset(dataset).map((entry) => entry.value);
    setConfig((current) => ({
      ...current,
      dataset,
      rows: current.rows.filter((dim) => dims.includes(dim)).slice(0, 2).length
        ? current.rows.filter((dim) => dims.includes(dim)).slice(0, 2)
        : [dims[0] ?? "team"],
      columns: current.columns.filter((dim) => dims.includes(dim)).slice(0, 2),
      measure: measures.includes(current.measure) ? current.measure : "count",
    }));
    setSelectedSavedId("");
  }

  function loadSavedReport(id: string) {
    setSelectedSavedId(id);
    const report = savedReports.find((entry) => entry.id === id);
    if (!report) return;
    const next = sanitizePivotConfig({
      ...(typeof report.config === "object" && report.config ? report.config : {}),
      name: report.name,
      description: report.description ?? "",
    });
    if (next) {
      setConfig(next);
      setMessage(`Loaded “${report.name}”.`);
      setError(null);
    }
  }

  async function saveReport(asNew = false) {
    if (storageMode !== "database") {
      setError("Saving requires the saved_reports database migration.");
      return;
    }
    setSaving(true);
    setError(null);
    setMessage(null);
    try {
      const payload = {
        name: config.name,
        description: config.description ?? "",
        config,
      };
      const response = await fetch(
        asNew || !selectedSavedId ? "/api/reports/saved" : `/api/reports/saved/${selectedSavedId}`,
        {
          method: asNew || !selectedSavedId ? "POST" : "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const resultPayload = await response.json().catch(() => null);
      if (!response.ok) {
        setError(resultPayload?.error ?? "Unable to save report.");
        return;
      }
      const saved = resultPayload?.report as SavedReportRow;
      setSavedReports((current) => {
        const without = current.filter((entry) => entry.id !== saved.id);
        return [saved, ...without];
      });
      setSelectedSavedId(saved.id);
      setMessage(`Saved “${saved.name}”.`);
    } catch {
      setError("Network error while saving.");
    } finally {
      setSaving(false);
    }
  }

  async function deleteReport() {
    if (!selectedSavedId || storageMode !== "database") return;
    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/reports/saved/${selectedSavedId}`, { method: "DELETE" });
      if (!response.ok) {
        const payload = await response.json().catch(() => null);
        setError(payload?.error ?? "Unable to delete report.");
        return;
      }
      setSavedReports((current) => current.filter((entry) => entry.id !== selectedSavedId));
      setSelectedSavedId("");
      setMessage("Saved report deleted.");
    } catch {
      setError("Network error while deleting.");
    } finally {
      setDeleting(false);
    }
  }

  function exportCsv() {
    const slug = config.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "pivot";
    downloadCsv(`tnvr-pivot-${slug}.csv`, pivotToCsv(result));
  }

  function printReport() {
    window.print();
  }

  return (
    <div className="space-y-4">
      <Card className="print:hidden">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <Table2 className="h-4 w-4" />
            Pivot report builder
          </CardTitle>
          <CardDescription>
            Choose rows, columns, and a measure to build a custom table. Save it for later or print
            a clean copy.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="pivot-name">Report name</Label>
                  <Input
                    id="pivot-name"
                    value={config.name}
                    onChange={(event) => updateConfig({ name: event.target.value })}
                    placeholder="e.g. Cases by team and status"
                  />
                </div>
                <div className="space-y-1.5 sm:col-span-2">
                  <Label htmlFor="pivot-description">Notes (optional)</Label>
                  <Input
                    id="pivot-description"
                    value={config.description ?? ""}
                    onChange={(event) => updateConfig({ description: event.target.value })}
                    placeholder="What this report is used for"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Dataset</Label>
                <div className="grid gap-2 sm:grid-cols-2">
                  {PIVOT_DATASETS.map((entry) => (
                    <button
                      key={entry.value}
                      type="button"
                      onClick={() => changeDataset(entry.value)}
                      className={cn(
                        "rounded-lg border p-3 text-left transition-colors",
                        config.dataset === entry.value
                          ? "border-primary bg-primary/5"
                          : "hover:bg-muted/50"
                      )}
                    >
                      <p className="text-sm font-medium">{entry.label}</p>
                      <p className="mt-1 text-xs text-muted-foreground">{entry.hint}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
                <DimensionSelect
                  id="pivot-row-1"
                  label="Row field"
                  value={config.rows[0] ?? ""}
                  options={dimensionOptions}
                  onChange={(value) =>
                    updateConfig({
                      rows: value
                        ? [value as PivotDimension, ...(config.rows[1] ? [config.rows[1]] : [])]
                        : config.rows.slice(1),
                    })
                  }
                />
                <DimensionSelect
                  id="pivot-row-2"
                  label="Second row field"
                  value={config.rows[1] ?? ""}
                  options={dimensionOptions.filter((entry) => entry.value !== config.rows[0])}
                  allowNone
                  onChange={(value) =>
                    updateConfig({
                      rows: value
                        ? [config.rows[0] ?? "team", value as PivotDimension]
                        : config.rows.slice(0, 1),
                    })
                  }
                />
                <DimensionSelect
                  id="pivot-col-1"
                  label="Column field"
                  value={config.columns[0] ?? ""}
                  options={dimensionOptions}
                  allowNone
                  onChange={(value) =>
                    updateConfig({
                      columns: value ? [value as PivotDimension] : [],
                    })
                  }
                />
                <div className="space-y-1.5">
                  <Label htmlFor="pivot-measure" className="text-xs font-medium text-muted-foreground">
                    Measure
                  </Label>
                  <Select
                    value={config.measure}
                    onValueChange={(value) => updateConfig({ measure: value as PivotMeasure })}
                  >
                    <SelectTrigger id="pivot-measure" className="h-9 w-full">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {measureOptions.map((entry) => (
                        <SelectItem key={entry.value} value={entry.value}>
                          {entry.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>

            <div className="space-y-4 rounded-lg border bg-muted/20 p-4">
              <div>
                <p className="text-sm font-medium">Filters</p>
                <p className="text-xs text-muted-foreground">
                  Optional filters apply before the pivot is calculated.
                </p>
              </div>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <Label htmlFor="pivot-from">From date</Label>
                  <Input
                    id="pivot-from"
                    type="date"
                    value={config.filters.dateFrom}
                    onChange={(event) => updateFilters({ dateFrom: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="pivot-to">To date</Label>
                  <Input
                    id="pivot-to"
                    type="date"
                    value={config.filters.dateTo}
                    onChange={(event) => updateFilters({ dateTo: event.target.value })}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label>ZIP</Label>
                  <Select
                    value={config.filters.zip || "all"}
                    onValueChange={(value) => updateFilters({ zip: value === "all" ? "" : value })}
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="All ZIPs" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All ZIPs</SelectItem>
                      {filterOptions.zips.map((zip) => (
                        <SelectItem key={zip} value={zip}>
                          {zip}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Team</Label>
                  <Select
                    value={config.filters.teamId || "all"}
                    onValueChange={(value) =>
                      updateFilters({ teamId: value === "all" ? "" : value })
                    }
                  >
                    <SelectTrigger className="h-9 w-full">
                      <SelectValue placeholder="All teams" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All teams</SelectItem>
                      {filterOptions.teams.map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {config.dataset !== "cases" ? (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Clinic</Label>
                    <Select
                      value={config.filters.clinicId || "all"}
                      onValueChange={(value) =>
                        updateFilters({ clinicId: value === "all" ? "" : value })
                      }
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="All clinics" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All clinics</SelectItem>
                        {filterOptions.clinics.map((clinic) => (
                          <SelectItem key={clinic.id} value={clinic.id}>
                            {clinic.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ) : (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Status</Label>
                    <Select
                      value={config.filters.status || "all"}
                      onValueChange={(value) =>
                        updateFilters({ status: value === "all" ? "" : value })
                      }
                    >
                      <SelectTrigger className="h-9 w-full">
                        <SelectValue placeholder="All statuses" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All statuses</SelectItem>
                        {filterOptions.statuses.map((status) => (
                          <SelectItem key={status.value} value={status.value}>
                            {status.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 border-t pt-4 lg:flex-row lg:items-end lg:justify-between">
            <div className="grid w-full gap-3 sm:grid-cols-[minmax(0,1fr)_auto] lg:max-w-xl">
              <div className="space-y-1.5">
                <Label>Saved reports</Label>
                <Select
                  value={selectedSavedId || "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setSelectedSavedId("");
                      return;
                    }
                    loadSavedReport(value);
                  }}
                  disabled={loadingSaved || savedReports.length === 0}
                >
                  <SelectTrigger className="h-9 w-full">
                    <SelectValue
                      placeholder={loadingSaved ? "Loading…" : "Load a saved report"}
                    />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">New unsaved report</SelectItem>
                    {savedReports.map((report) => (
                      <SelectItem key={report.id} value={report.id}>
                        {report.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  type="button"
                  onClick={() => void saveReport(false)}
                  disabled={saving || storageMode !== "database"}
                >
                  {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                  {selectedSavedId ? "Update" : "Save"}
                </Button>
                {selectedSavedId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void saveReport(true)}
                    disabled={saving || storageMode !== "database"}
                  >
                    Save as new
                  </Button>
                ) : null}
                {selectedSavedId ? (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => void deleteReport()}
                    disabled={deleting || storageMode !== "database"}
                  >
                    {deleting ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                onClick={exportCsv}
                disabled={result.rowKeys.length === 0}
              >
                <Download className="mr-2 h-4 w-4" />
                Export CSV
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={printReport}
                disabled={result.rowKeys.length === 0}
              >
                <Printer className="mr-2 h-4 w-4" />
                Print
              </Button>
            </div>
          </div>

          {message ? <p className="text-sm text-muted-foreground">{message}</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </CardContent>
      </Card>

      <Card className="print:border-0 print:shadow-none">
        <CardHeader className="print:pb-2">
          <CardTitle className="text-xl">{config.name || "Untitled pivot"}</CardTitle>
          <CardDescription className="space-y-1">
            <span className="block">
              {PIVOT_DATASETS.find((entry) => entry.value === config.dataset)?.label} ·{" "}
              {result.measureLabel}
              {result.rowFields.length
                ? ` · Rows: ${result.rowFields.map(dimensionLabel).join(" → ")}`
                : ""}
              {result.columnFields.length
                ? ` · Columns: ${result.columnFields.map(dimensionLabel).join(" → ")}`
                : ""}
            </span>
            {config.description ? <span className="block">{config.description}</span> : null}
            <span className="block text-xs">
              {result.recordCount} source record{result.recordCount === 1 ? "" : "s"} · Grand total{" "}
              {result.grandTotal.toLocaleString()}
            </span>
          </CardDescription>
        </CardHeader>
        <CardContent>
          {result.rowKeys.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">
              No records match this pivot. Adjust filters or fields.
            </p>
          ) : (
            <div className="overflow-x-auto rounded-md border print:overflow-visible">
              <table className="w-full min-w-[28rem] border-collapse text-sm">
                <thead>
                  <tr className="bg-muted/50">
                    {result.rowFields.map((field) => (
                      <th
                        key={field}
                        className="border-b px-3 py-2 text-left font-medium whitespace-nowrap"
                      >
                        {dimensionLabel(field)}
                      </th>
                    ))}
                    {result.columnKeys.map((columnKey) => (
                      <th
                        key={columnKey}
                        className="border-b px-3 py-2 text-right font-medium whitespace-nowrap"
                      >
                        {formatPivotKey(columnKey)}
                      </th>
                    ))}
                    <th className="border-b px-3 py-2 text-right font-semibold whitespace-nowrap">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {result.rowKeys.map((rowKey, rowIndex) => {
                    const parts = rowKey.split("||");
                    return (
                      <tr key={rowKey} className="odd:bg-background even:bg-muted/20">
                        {parts.map((part, partIndex) => (
                          <td
                            key={`${rowKey}-${partIndex}`}
                            className="border-b px-3 py-2 whitespace-nowrap"
                          >
                            {part}
                          </td>
                        ))}
                        {(result.matrix[rowIndex] ?? []).map((value, colIndex) => (
                          <td
                            key={`${rowKey}-c${colIndex}`}
                            className="border-b px-3 py-2 text-right tabular-nums"
                          >
                            {value ? value.toLocaleString() : "—"}
                          </td>
                        ))}
                        <td className="border-b px-3 py-2 text-right font-medium tabular-nums">
                          {(result.rowTotals[rowIndex] ?? 0).toLocaleString()}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot>
                  <tr className="bg-muted/40">
                    <td
                      className="px-3 py-2 font-semibold"
                      colSpan={Math.max(result.rowFields.length, 1)}
                    >
                      Total
                    </td>
                    {result.columnTotals.map((value, index) => (
                      <td
                        key={`col-total-${index}`}
                        className="px-3 py-2 text-right font-semibold tabular-nums"
                      >
                        {value.toLocaleString()}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-semibold tabular-nums">
                      {result.grandTotal.toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
