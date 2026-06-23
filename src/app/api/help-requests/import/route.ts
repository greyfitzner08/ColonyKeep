import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { applyTrapTeamAssignment } from "@/lib/cases/assign-team-by-zip";
import { mapImportRowToHelpRequest } from "@/lib/cases/import-mapper";
import { parseCaseImportCsv } from "@/lib/cases/parse-case-import-csv";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const csvText = typeof body.csvText === "string" ? body.csvText : undefined;
  const parsedRows = csvText
    ? parseCaseImportCsv(csvText)
    : { rows: (body.rows as Record<string, unknown>[] | undefined) ?? [], headerRowIndex: 0 };

  const rows = parsedRows.rows;

  if (!rows.length) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: teams } = await service
    .from("trap_teams")
    .select("id, name, zip_codes, is_active")
    .eq("is_active", true);

  const created: { case_number: string }[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const mapped = mapImportRowToHelpRequest(rows[index], profile!.email);
    if (mapped.error || !mapped.record) {
      errors.push({
        row: index + parsedRows.headerRowIndex + 2,
        error: mapped.error ?? "Invalid row",
      });
      continue;
    }

    const colonyZip = String(mapped.record.colony_zip ?? "");
    const record = applyTrapTeamAssignment(mapped.record, colonyZip, teams ?? []);

    const { data, error } = await service
      .from("help_requests")
      .insert(record)
      .select("case_number")
      .single();

    if (error) {
      errors.push({ row: index + parsedRows.headerRowIndex + 2, error: error.message });
      continue;
    }

    created.push({ case_number: data.case_number });
  }

  return NextResponse.json({
    success: errors.length === 0,
    imported: created.length,
    caseNumbers: created.map((entry) => entry.case_number),
    errors,
  });
}
