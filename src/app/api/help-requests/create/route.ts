import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { applyTrapTeamAssignment } from "@/lib/cases/assign-team-by-zip";
import { detectMedicalKeywords } from "@/lib/medical-flags";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const service = await createServiceClient();
  const medicalFlags = detectMedicalKeywords(body.intake_notes ?? "");

  const { data: teams } = await service
    .from("trap_teams")
    .select("id, name, zip_codes, is_active")
    .eq("is_active", true);

  const record = applyTrapTeamAssignment(
    {
      ...body,
      status: "new_intake",
      medical_flags: medicalFlags,
      history_log: [
        {
          timestamp: new Date().toISOString(),
          action: "created",
          actor_email: null,
          actor_name: body.contact_name,
          details: "Public intake form submission",
        },
      ],
    },
    body.colony_zip,
    teams ?? []
  );

  const { data, error } = await service
    .from("help_requests")
    .insert(record)
    .select("case_number")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ caseNumber: data.case_number });
}
