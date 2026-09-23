import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import {
  EXPORTABLE_TABLES,
  getExportableTable,
  sanitizeExportColumns,
} from "@/lib/admin/table-export-catalog";
import { rowsToCsv } from "@/lib/reports/export-csv";
import { createServiceClient } from "@/lib/supabase/server";

const MAX_ROWS = 50_000;

export async function GET() {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  return NextResponse.json({
    tables: EXPORTABLE_TABLES.map((table) => ({
      id: table.id,
      label: table.label,
      columns: table.columns,
    })),
  });
}

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json().catch(() => null);
  const tableId = typeof body?.table === "string" ? body.table.trim() : "";
  const requestedColumns = Array.isArray(body?.columns)
    ? (body.columns as unknown[]).map((entry) => String(entry ?? ""))
    : [];
  const format = body?.format === "json" ? "json" : "csv";

  const table = getExportableTable(tableId);
  if (!table) {
    return NextResponse.json({ error: "Unknown or non-exportable table." }, { status: 400 });
  }

  const columns = sanitizeExportColumns(tableId, requestedColumns);
  if (!columns || columns.length === 0) {
    return NextResponse.json(
      { error: "Select at least one valid column to export." },
      { status: 400 }
    );
  }

  const service = await createServiceClient();
  const { data, error } = await service
    .from(table.id)
    .select(columns.join(","))
    .limit(MAX_ROWS);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const rows = (data as unknown as Array<Record<string, unknown>> | null) ?? [];
  const columnMeta = columns.map((id) => {
    const match = table.columns.find((column) => column.id === id);
    return { id, label: match?.label ?? id };
  });

  if (format === "json") {
    return NextResponse.json({
      table: table.id,
      label: table.label,
      columns: columnMeta,
      rowCount: rows.length,
      truncated: rows.length >= MAX_ROWS,
      rows,
    });
  }

  const csv = rowsToCsv(columnMeta, rows);
  const filename = `${table.id}-export.csv`;
  return new NextResponse(csv, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "X-Export-Row-Count": String(rows.length),
      "X-Export-Truncated": rows.length >= MAX_ROWS ? "1" : "0",
    },
  });
}
