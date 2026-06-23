import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { applyTrapTeamAssignment } from "@/lib/cases/assign-team-by-zip";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(_request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const service = await createServiceClient();
  const { data: teams } = await service
    .from("trap_teams")
    .select("id, name, zip_codes, is_active")
    .eq("is_active", true);

  const { data: cases, error: fetchError } = await service
    .from("help_requests")
    .select("id, colony_zip, assigned_team_id")
    .is("assigned_team_id", null);

  if (fetchError) {
    return NextResponse.json({ error: fetchError.message }, { status: 400 });
  }

  let updated = 0;
  for (const row of cases ?? []) {
    const assignment = applyTrapTeamAssignment({}, row.colony_zip, teams ?? []);
    if (!assignment.assigned_team_id) continue;

    const { error } = await service
      .from("help_requests")
      .update({
        assigned_team_id: assignment.assigned_team_id,
        assigned_team_name: assignment.assigned_team_name,
        assigned_team: assignment.assigned_team_name,
      })
      .eq("id", row.id);

    if (!error) updated += 1;
  }

  return NextResponse.json({ success: true, updated });
}
