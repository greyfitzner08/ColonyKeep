import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import {
  buildVolunteerImportPreview,
  parseVolunteerImportCsv,
  type VolunteerImportExistingSummary,
} from "@/lib/volunteers/import-duplicate";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const csvText = typeof body.csvText === "string" ? body.csvText : "";
  const parsedRows = parseVolunteerImportCsv(csvText);

  if (!parsedRows.length) {
    return NextResponse.json({ error: "No rows to import" }, { status: 400 });
  }

  const emails = Array.from(
    new Set(
      parsedRows
        .map((entry) => entry.record?.email.toLowerCase())
        .filter((email): email is string => Boolean(email))
    )
  );

  const existingByEmail = new Map<string, VolunteerImportExistingSummary>();
  if (emails.length > 0) {
    const service = await createServiceClient();
    const { data: existingRows, error } = await service
      .from("volunteer_applications")
      .select(
        "id, full_name, email, phone, birthday, status, roles_requested, why_volunteer, prior_experience, how_heard, liability_waiver_signed, policy_signed, tnvr_certificate_uploaded, admin_notes"
      )
      .in("email", emails);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    for (const row of existingRows ?? []) {
      existingByEmail.set(String(row.email).toLowerCase(), row as VolunteerImportExistingSummary);
    }
  }

  const preview = buildVolunteerImportPreview(parsedRows, existingByEmail);

  return NextResponse.json({
    preview,
    totalRows: parsedRows.length,
    readyCount: preview.uniqueRows.length,
    duplicateCount: preview.duplicateGroups.length,
    errorCount: preview.errors.length,
  });
}
