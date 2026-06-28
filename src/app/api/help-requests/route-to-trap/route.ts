import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { applyTrapTeamAssignment } from "@/lib/cases/assign-team-by-zip";
import { releaseIntakeAssignmentFields } from "@/lib/cases/case-assignment";
import { INTAKE_QUEUE_STATUSES } from "@/lib/cases/statuses";
import { createServiceClient } from "@/lib/supabase/server";
import type { HelpRequestStatus, HistoryEntry } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin", "inquiry_team"]);
  if (response) return response;

  const body = await request.json();
  const { helpRequestId } = body as { helpRequestId?: string };

  if (!helpRequestId) {
    return NextResponse.json({ error: "Missing helpRequestId" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: existing, error: fetchError } = await service
    .from("help_requests")
    .select(
      "id, status, colony_zip, assigned_team_id, assigned_team_name, history_log, claimed_by_email, claimed_by_name, assigned_to"
    )
    .eq("id", helpRequestId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: fetchError?.message ?? "Case not found" }, { status: 404 });
  }

  const status = existing.status as HelpRequestStatus;
  if (!INTAKE_QUEUE_STATUSES.includes(status)) {
    return NextResponse.json(
      { error: "Only cases still in the inquiry queue can be routed to a trap team." },
      { status: 400 }
    );
  }

  const { data: teams } = await service
    .from("trap_teams")
    .select("id, name, zip_codes, is_active")
    .eq("is_active", true);

  const assignment = applyTrapTeamAssignment({}, existing.colony_zip, teams ?? []);
  const teamName = assignment.assigned_team_name ?? existing.assigned_team_name;
  const hadIntakeClaim = Boolean(
    existing.claimed_by_email?.trim() ||
      existing.claimed_by_name?.trim() ||
      existing.assigned_to?.trim()
  );

  const historyEntry: HistoryEntry = {
    timestamp: new Date().toISOString(),
    action: "routed_to_trap_team",
    actor_email: profile!.email,
    actor_name: profile!.full_name ?? profile!.email,
    details: teamName
      ? `Routed to trap team ${teamName} by intake${hadIntakeClaim ? " (released from intake assignment)" : ""}`
      : `Routed to trap queue by intake${hadIntakeClaim ? " (released from intake assignment)" : ""} (no matching team ZIP)`,
  };

  const historyLog = [...(existing.history_log ?? []), historyEntry];

  const { error } = await service
    .from("help_requests")
    .update({
      ...releaseIntakeAssignmentFields({
        status: "routed_to_trap_team",
        assigned_team_id: assignment.assigned_team_id ?? existing.assigned_team_id,
        assigned_team_name: teamName,
        history_log: historyLog,
      }),
      assigned_team: teamName,
    })
    .eq("id", helpRequestId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    assignedTeamId: assignment.assigned_team_id ?? existing.assigned_team_id ?? null,
    assignedTeamName: teamName ?? null,
  });
}
