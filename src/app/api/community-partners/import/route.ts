import { NextRequest, NextResponse } from "next/server";
import { requireCommunityPartnerManager } from "@/lib/api/auth";
import { mapCommunityPartnerImportRow } from "@/lib/community-partners/import-mapper";
import { parseCsv } from "@/lib/csv";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { response } = await requireCommunityPartnerManager();
  if (response) return response;

  const body = await request.json();
  const csvText = typeof body.csvText === "string" ? body.csvText : "";
  const rows = parseCsv(csvText.replace(/^\uFEFF/, "").trim());

  if (!rows.length) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const service = await createServiceClient();
  const imported: { name: string }[] = [];
  const errors: { row: number; error: string }[] = [];

  for (let index = 0; index < rows.length; index += 1) {
    const mapped = mapCommunityPartnerImportRow(rows[index]);
    if (mapped.error || !mapped.record) {
      errors.push({ row: index + 2, error: mapped.error ?? "Invalid row" });
      continue;
    }

    const { error } = await service.from("community_partners").insert(mapped.record);
    if (error) {
      errors.push({ row: index + 2, error: error.message });
      continue;
    }

    imported.push({ name: mapped.record.name });
  }

  return NextResponse.json({
    success: errors.length === 0,
    imported: imported.length,
    partners: imported,
    errors,
  });
}
