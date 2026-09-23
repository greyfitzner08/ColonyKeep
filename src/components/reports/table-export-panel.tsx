"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Download, Loader2, Search, X } from "lucide-react";
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
import { getApiErrorMessage } from "@/lib/api/errors";
import {
  EXPORTABLE_TABLES,
  getExportableTable,
  type ExportableColumn,
  type ExportableTableId,
} from "@/lib/admin/table-export-catalog";
import { downloadCsv } from "@/lib/reports/export-csv";
import { cn } from "@/lib/utils";

export function TableExportPanel() {
  const [tableId, setTableId] = useState<ExportableTableId>(EXPORTABLE_TABLES[0]!.id);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [columnQuery, setColumnQuery] = useState("");
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const table = useMemo(() => getExportableTable(tableId), [tableId]);

  useEffect(() => {
    if (!table) return;
    // Start empty so every column stays visible in the options list.
    setSelectedColumns([]);
    setColumnQuery("");
    setError(null);
    setStatus(null);
  }, [table]);

  const selectedSet = useMemo(() => new Set(selectedColumns), [selectedColumns]);

  const filteredColumns = useMemo(() => {
    if (!table) return [];
    const query = columnQuery.trim().toLowerCase();
    if (!query) return table.columns;
    return table.columns.filter(
      (column) =>
        column.label.toLowerCase().includes(query) || column.id.toLowerCase().includes(query)
    );
  }, [table, columnQuery]);

  const selectedColumnDetails = useMemo(() => {
    if (!table) return [] as ExportableColumn[];
    const byId = new Map(table.columns.map((column) => [column.id, column]));
    return selectedColumns
      .map((id) => byId.get(id))
      .filter((column): column is ExportableColumn => Boolean(column));
  }, [table, selectedColumns]);

  function toggleColumn(columnId: string) {
    setSelectedColumns((current) =>
      current.includes(columnId)
        ? current.filter((id) => id !== columnId)
        : [...current, columnId]
    );
  }

  function removeColumn(columnId: string) {
    setSelectedColumns((current) => current.filter((id) => id !== columnId));
  }

  function addShown() {
    setSelectedColumns((current) => {
      const next = [...current];
      for (const column of filteredColumns) {
        if (!next.includes(column.id)) next.push(column.id);
      }
      return next;
    });
  }

  function selectAll() {
    if (!table) return;
    setSelectedColumns(table.columns.map((column) => column.id));
  }

  function clearAll() {
    setSelectedColumns([]);
  }

  async function runExport() {
    if (!table || selectedColumns.length === 0) {
      setError("Select at least one column to export.");
      return;
    }

    setExporting(true);
    setError(null);
    setStatus(null);

    try {
      const response = await fetch("/api/admin/export", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          table: table.id,
          columns: selectedColumns,
          format: "csv",
        }),
      });

      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(getApiErrorMessage(result, "Unable to export table"));
        return;
      }

      const csv = await response.text();
      const rowCount = Number(response.headers.get("X-Export-Row-Count") ?? "0");
      const truncated = response.headers.get("X-Export-Truncated") === "1";
      downloadCsv(`${table.id}-export.csv`, csv);
      setStatus(
        truncated
          ? `Downloaded first ${rowCount.toLocaleString()} rows (export limit reached).`
          : `Downloaded ${rowCount.toLocaleString()} row${rowCount === 1 ? "" : "s"}.`
      );
    } catch {
      setError("Unable to export table");
    } finally {
      setExporting(false);
    }
  }

  if (!table) return null;

  const shownSelectedCount = filteredColumns.filter((column) =>
    selectedSet.has(column.id)
  ).length;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Table export</CardTitle>
        <CardDescription>
          Download a CSV of any platform table. Search columns, click to include them, then
          download — useful for backups, audits, and offline analysis.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2 max-w-md">
          <Label>Table</Label>
          <Select
            value={tableId}
            onValueChange={(value) => setTableId(value as ExportableTableId)}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a table" />
            </SelectTrigger>
            <SelectContent>
              {EXPORTABLE_TABLES.map((entry) => (
                <SelectItem key={entry.id} value={entry.id}>
                  {entry.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {table.columns.length} columns available · exports up to 50,000 rows
          </p>
        </div>

        <div className="space-y-2 max-w-md">
          <Label htmlFor="export-column-search">Find columns</Label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="export-column-search"
              value={columnQuery}
              onChange={(event) => setColumnQuery(event.target.value)}
              placeholder="Search by name or field…"
              className="pl-8"
            />
          </div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>
                Columns ({shownSelectedCount}/{filteredColumns.length} shown selected)
              </Label>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addShown}
                  disabled={filteredColumns.length === 0}
                >
                  Add shown
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                  Select all
                </Button>
              </div>
            </div>
            <div className="h-72 overflow-y-auto rounded-md border">
              {filteredColumns.length === 0 ? (
                <p className="px-3 py-6 text-sm text-muted-foreground">
                  No columns match that search.
                </p>
              ) : (
                <ul className="divide-y">
                  {filteredColumns.map((column) => {
                    const selected = selectedSet.has(column.id);
                    return (
                      <li key={column.id}>
                        <button
                          type="button"
                          onClick={() => toggleColumn(column.id)}
                          aria-pressed={selected}
                          className={cn(
                            "flex w-full items-center gap-2 px-3 py-2.5 text-left text-sm",
                            "hover:bg-muted/50 focus-visible:bg-muted/50 focus-visible:outline-none",
                            selected && "bg-muted/40"
                          )}
                        >
                          <span
                            className={cn(
                              "flex h-5 w-5 shrink-0 items-center justify-center rounded border",
                              selected
                                ? "border-primary bg-primary text-primary-foreground"
                                : "border-muted-foreground/40"
                            )}
                            aria-hidden
                          >
                            {selected ? <Check className="h-3.5 w-3.5" /> : null}
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block font-medium leading-snug">{column.label}</span>
                            <span className="block truncate text-xs text-muted-foreground">
                              {column.id}
                            </span>
                          </span>
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <Label>
                Selected for export ({selectedColumns.length}/{table.columns.length})
              </Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={clearAll}
                disabled={selectedColumns.length === 0}
              >
                Clear
              </Button>
            </div>
            <div className="h-72 overflow-y-auto rounded-md border bg-muted/20">
              {selectedColumnDetails.length === 0 ? (
                <p className="px-3 py-6 text-sm text-muted-foreground">
                  Click columns on the left to include them in the CSV.
                </p>
              ) : (
                <ul className="divide-y">
                  {selectedColumnDetails.map((column, index) => (
                    <li
                      key={column.id}
                      className="flex items-center gap-2 px-3 py-2.5 text-sm"
                    >
                      <span className="w-6 shrink-0 text-xs tabular-nums text-muted-foreground">
                        {index + 1}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block font-medium leading-snug">{column.label}</span>
                        <span className="block truncate text-xs text-muted-foreground">
                          {column.id}
                        </span>
                      </span>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 shrink-0"
                        onClick={() => removeColumn(column.id)}
                        aria-label={`Remove ${column.label}`}
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        {status ? <p className="text-sm text-muted-foreground">{status}</p> : null}

        <Button
          type="button"
          onClick={() => void runExport()}
          disabled={exporting || selectedColumns.length === 0}
        >
          {exporting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Exporting…
            </>
          ) : (
            <>
              <Download className="mr-2 h-4 w-4" />
              Download CSV
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}
