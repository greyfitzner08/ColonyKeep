import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { mapImportRowToHelpRequest } from "@/lib/cases/import-mapper";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const rows = body.rows as Record<string, unknown>[] | undefined;

  if (!rows?.length) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const service = await createServiceClient();
  const created: { case_number: string }[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const mapped = mapImportRowToHelpRequest(rows[index], profile!.email);
    if (mapped.error || !mapped.record) {
      errors.push({ row: index + 2, error: mapped.error ?? "Invalid row" });
      continue;
    }

    const { data, error } = await service
      .from("help_requests")
      .insert(mapped.record)
      .select("case_number")
      .single();

    if (error) {
      errors.push({ row: index + 2, error: error.message });
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
