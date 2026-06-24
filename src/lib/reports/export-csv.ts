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

export function reportToCsv(result: ReportResult): string {
  const headers = result.columns.map((column) => column.label);
  const lines = [
    headers.map((header) => `"${header.replace(/"/g, '""')}"`).join(","),
    ...result.rows.map((row) =>
      result.columns
        .map((column) => `"${cellValue(row, column.key).replace(/"/g, '""')}"`)
        .join(",")
    ),
  ];
  return lines.join("\n");
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
