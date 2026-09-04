import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { intakeClaimRequiredResponse } from "@/lib/cases/intake-claim-api";
import { createServiceClient } from "@/lib/supabase/server";
import type { HelpRequestStatus, HistoryEntry } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin", "trap_team_lead"]);
  if (response) return response;

  const body = await request.json().catch(() => null);
  const helpRequestId = body?.helpRequestId as string | undefined;
  const outcome = typeof body?.outcome === "string" ? body.outcome.trim() : "";
  const closureNotes =
    typeof body?.closure_notes === "string" ? body.closure_notes.trim() : null;

  if (!helpRequestId) {
    return NextResponse.json({ error: "Missing helpRequestId" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: existing, error: fetchError } = await service
    .from("help_requests")
    .select("id, status, history_log, claimed_by_email")
    .eq("id", helpRequestId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: fetchError?.message ?? "Case not found" }, { status: 404 });
  }

  const claimBlock = intakeClaimRequiredResponse({
    role: profile!.role,
    status: existing.status as HelpRequestStatus,
    claimedByEmail: existing.claimed_by_email,
    actorEmail: profile!.email,
  });
  if (claimBlock) return claimBlock;

  if (existing.status === "closed") {
    return NextResponse.json({ error: "Case is already closed." }, { status: 400 });
  }

  const historyEntry: HistoryEntry = {
    timestamp: new Date().toISOString(),
    action: "closed",
    actor_email: profile!.email,
    actor_name: profile!.full_name ?? profile!.email,
    details: outcome ? `Closed with outcome: ${outcome}` : "Case closed",
  };

  const history_log = [...(existing.history_log ?? []), historyEntry];
  const closedAt = new Date().toISOString();

  const { error } = await service
    .from("help_requests")
    .update({
      status: "closed",
      outcome: outcome || null,
      closure_notes: closureNotes,
      closed_at: closedAt,
      history_log,
    })
    .eq("id", helpRequestId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, closed_at: closedAt });
}
