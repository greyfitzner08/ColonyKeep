import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";
import { applyTrapTeamAssignment } from "@/lib/cases/assign-team-by-zip";
import { mapCommunityIntakeToHelpRequest } from "@/lib/cases/public-intake";
import { sanitizeHelpRequestRecord } from "@/lib/cases/help-request-insert";
import { geocodeAddress } from "@/lib/geocode";

export async function POST(request: NextRequest) {
  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json(
      {
        error:
          "Intake submissions are temporarily unavailable. The server is missing database configuration.",
      },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const contactName = [body.contact_first_name, body.contact_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  const actorName =
    contactName ||
    (typeof body.contact_name === "string" ? body.contact_name.trim() : "") ||
    (typeof body.contact_email === "string" ? body.contact_email : "") ||
    "Community member";

  const mapped = mapCommunityIntakeToHelpRequest(body, actorName);

  if (mapped.error || !mapped.record) {
    return NextResponse.json({ error: mapped.error ?? "Invalid submission" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: teams } = await service
    .from("trap_teams")
    .select("id, name, zip_codes, is_active")
    .eq("is_active", true);

  const assigned = applyTrapTeamAssignment(
    mapped.record,
    String(mapped.record.colony_zip ?? ""),
    teams ?? []
  );

  const record = sanitizeHelpRequestRecord(assigned);

  if (!record.colony_lat || !record.colony_lng) {
    const coords = await geocodeAddress({
      colony_address: String(record.colony_address ?? ""),
      colony_city: String(record.colony_city ?? ""),
      colony_state: String(record.colony_state ?? ""),
      colony_zip: String(record.colony_zip ?? ""),
      colony_county: String(record.colony_county ?? ""),
    });
    if (coords) {
      record.colony_lat = coords.lat;
      record.colony_lng = coords.lng;
    }
  }

  const { data, error } = await service
    .from("help_requests")
    .insert(record)
    .select("case_number")
    .single();

  if (error) {
    console.error("help-requests/create insert failed:", error.message);
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ caseNumber: data.case_number });
}
