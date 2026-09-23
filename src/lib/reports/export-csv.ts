import type { ReportResult } from "@/lib/reports/aggregations";

function cellValue(row: ReportResult["rows"][number], columnKey: string): string {
  if (columnKey.startsWith("extra.")) {
    const field = columnKey.slice("extra.".length);
    return String(row.extra?.[field] ?? "");
  }
  if (columnKey === "cats") return String(row.cats ?? row.count ?? "");
  const value = row[columnKey as keyof typeof row];
  return value == null ? "" : String(value);
}

function csvEscape(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

function formatExportCell(value: unknown): string {
  if (value == null) return "";
  if (typeof value === "string") return value;
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  if (value instanceof Date) return value.toISOString();
  try {
    return JSON.stringify(value);
  } catch {
    return String(value);
  }
}

export function reportToCsv(result: ReportResult): string {
  const headers = result.columns.map((column) => column.label);
  const lines = [
    headers.map((header) => csvEscape(header)).join(","),
    ...result.rows.map((row) =>
      result.columns.map((column) => csvEscape(cellValue(row, column.key))).join(",")
    ),
  ];
  return lines.join("\n");
}

/** Build CSV from arbitrary row objects and selected column ids. */
export function rowsToCsv(
  columns: Array<{ id: string; label: string }>,
  rows: Array<Record<string, unknown>>
): string {
  const header = columns.map((column) => csvEscape(column.label)).join(",");
  const body = rows.map((row) =>
    columns.map((column) => csvEscape(formatExportCell(row[column.id]))).join(",")
  );
  return [header, ...body].join("\n");
}

export function downloadCsv(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
