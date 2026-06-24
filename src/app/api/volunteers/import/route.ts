import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { parseCsv } from "@/lib/csv";
import { mapVolunteerImportRow } from "@/lib/volunteers/import-mapper";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const csvText = typeof body.csvText === "string" ? body.csvText : "";
  const rows = parseCsv(csvText.replace(/^\uFEFF/, "").trim());

  if (!rows.length) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const service = await createServiceClient();
  const imported: { email: string; full_name: string }[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const mapped = mapVolunteerImportRow(rows[index]);
    if (mapped.error || !mapped.record) {
      errors.push({ row: index + 2, error: mapped.error ?? "Invalid row" });
      continue;
    }

    const email = String(mapped.record.email);
    const { data: existing } = await service
      .from("volunteer_applications")
      .select("id")
      .eq("email", email)
      .maybeSingle();

    if (existing) {
      errors.push({ row: index + 2, error: `Application already exists for ${email}` });
      continue;
    }

    const { error } = await service.from("volunteer_applications").insert(mapped.record);
    if (error) {
      errors.push({ row: index + 2, error: error.message });
      continue;
    }

    imported.push({
      email,
      full_name: String(mapped.record.full_name),
    });
  }

  return NextResponse.json({
    success: errors.length === 0,
    imported: imported.length,
    volunteers: imported,
    errors,
  });
}
