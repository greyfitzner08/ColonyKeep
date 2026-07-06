import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { applyTrapTeamAssignment } from "@/lib/cases/assign-team-by-zip";
import { mapImportRowToHelpRequest } from "@/lib/cases/import-mapper";
import { parseCaseImportCsv } from "@/lib/cases/parse-case-import-csv";
import { sanitizeHelpRequestRecord } from "@/lib/cases/help-request-insert";
import {
  geocodeColonyFields,
  hasGeocodableColonyAddress,
} from "@/lib/help-requests/geocode-backfill";
import { createServiceClient } from "@/lib/supabase/server";

function colonyFieldsFromRecord(record: Record<string, unknown>) {
  return {
    colony_address: typeof record.colony_address === "string" ? record.colony_address : null,
    colony_city: typeof record.colony_city === "string" ? record.colony_city : null,
    colony_state: typeof record.colony_state === "string" ? record.colony_state : null,
    colony_zip: typeof record.colony_zip === "string" ? record.colony_zip : null,
    colony_county: typeof record.colony_county === "string" ? record.colony_county : null,
  };
}

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
  let geocodeDeferred = 0;

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
    const record = sanitizeHelpRequestRecord(
      applyTrapTeamAssignment(mapped.record, colonyZip, teams ?? [])
    );

    const { data, error } = await service
      .from("help_requests")
      .insert(record)
      .select("id, case_number")
      .single();

    if (error) {
      errors.push({ row: index + parsedRows.headerRowIndex + 2, error: error.message });
      continue;
    }

    const colonyFields = colonyFieldsFromRecord(record);
    if (data?.id && hasGeocodableColonyAddress(colonyFields)) {
      if (process.env.GOOGLE_MAPS_API_KEY) {
        try {
          const coords = await geocodeColonyFields(colonyFields);
          if (coords) {
            await service
              .from("help_requests")
              .update({ colony_lat: coords.lat, colony_lng: coords.lng })
              .eq("id", data.id);
          }
        } catch {
          geocodeDeferred += 1;
        }
      } else {
        geocodeDeferred += 1;
      }
    }

    created.push({ case_number: data.case_number });
  }

  return NextResponse.json({
    success: errors.length === 0,
    imported: created.length,
    caseNumbers: created.map((entry) => entry.case_number),
    geocodeDeferred,
    errors,
  });
}
