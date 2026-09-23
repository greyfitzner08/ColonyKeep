"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
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
  type ExportableTableId,
} from "@/lib/admin/table-export-catalog";
import { downloadCsv } from "@/lib/reports/export-csv";

export function TableExportPanel() {
  const [tableId, setTableId] = useState<ExportableTableId>(EXPORTABLE_TABLES[0]!.id);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);

  const table = useMemo(() => getExportableTable(tableId), [tableId]);

  useEffect(() => {
    if (!table) return;
    setSelectedColumns(table.columns.map((column) => column.id));
    setError(null);
    setStatus(null);
  }, [table]);

  function toggleColumn(columnId: string, checked: boolean) {
    setSelectedColumns((current) => {
      if (checked) {
        if (current.includes(columnId)) return current;
        return [...current, columnId];
      }
      return current.filter((id) => id !== columnId);
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Table export</CardTitle>
        <CardDescription>
          Download a CSV of any platform table. Choose which columns to include — useful for
          backups, audits, and offline analysis.
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

        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Label>
              Columns ({selectedColumns.length}/{table.columns.length})
            </Label>
            <div className="flex gap-2">
              <Button type="button" variant="outline" size="sm" onClick={selectAll}>
                Select all
              </Button>
              <Button type="button" variant="outline" size="sm" onClick={clearAll}>
                Clear
              </Button>
            </div>
          </div>

          <div className="max-h-72 overflow-y-auto rounded-md border p-3">
            <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
              {table.columns.map((column) => {
                const checked = selectedColumns.includes(column.id);
                return (
                  <label
                    key={column.id}
                    className="flex items-start gap-2 rounded-md px-1 py-1 text-sm hover:bg-muted/40"
                  >
                    <Checkbox
                      checked={checked}
                      onCheckedChange={(value) => toggleColumn(column.id, value === true)}
                      className="mt-0.5"
                    />
                    <span className="min-w-0">
                      <span className="font-medium leading-snug">{column.label}</span>
                      <span className="block truncate text-xs text-muted-foreground">
                        {column.id}
                      </span>
                    </span>
                  </label>
                );
              })}
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
