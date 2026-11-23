import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { intakeClaimRequiredResponse } from "@/lib/cases/intake-claim-api";
import { caseCloseOutcomeLabel } from "@/lib/cases/case-closure";
import { normalizeHistoryLog } from "@/lib/cases/history-log";
import { createServiceClient } from "@/lib/supabase/server";
import type { HelpRequestStatus, HistoryEntry } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin", "trap_team_lead"]);
  if (response) return response;

  const body = await request.json().catch(() => null);
  const helpRequestId = body?.helpRequestId as string | undefined;
  const hasOutcome = Object.prototype.hasOwnProperty.call(body ?? {}, "outcome");
  const hasClosureNotes = Object.prototype.hasOwnProperty.call(body ?? {}, "closure_notes");

  if (!helpRequestId || (!hasOutcome && !hasClosureNotes)) {
    return NextResponse.json(
      { error: "Missing helpRequestId or closure fields to update" },
      { status: 400 }
    );
  }

  const nextOutcome =
    hasOutcome && typeof body?.outcome === "string" ? body.outcome.trim() || null : undefined;
  const nextClosureNotes =
    hasClosureNotes && typeof body?.closure_notes === "string"
      ? body.closure_notes.trim() || null
      : hasClosureNotes && body?.closure_notes == null
        ? null
        : undefined;

  const service = await createServiceClient();
  const { data: existing, error: fetchError } = await service
    .from("help_requests")
    .select("id, status, outcome, closure_notes, history_log, claimed_by_email")
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

  const previousOutcome = (existing.outcome as string | null) ?? null;
  const previousNotes = (existing.closure_notes as string | null) ?? null;
  const outcome = nextOutcome !== undefined ? nextOutcome : previousOutcome;
  const closureNotes = nextClosureNotes !== undefined ? nextClosureNotes : previousNotes;

  const actor = {
    actor_email: profile!.email,
    actor_name: profile!.full_name ?? profile!.email,
  };
  const now = new Date().toISOString();
  const historyEntries: HistoryEntry[] = [];

  if (nextOutcome !== undefined && nextOutcome !== previousOutcome) {
    historyEntries.push({
      id: crypto.randomUUID(),
      timestamp: now,
      action: "closure_outcome_updated",
      ...actor,
      details: `Changed close outcome from ${caseCloseOutcomeLabel(previousOutcome)} to ${caseCloseOutcomeLabel(nextOutcome)}`,
    });
  }

  if (nextClosureNotes !== undefined && nextClosureNotes !== previousNotes) {
    const details = nextClosureNotes
      ? `Updated closure notes: ${nextClosureNotes}`
      : "Cleared closure notes";
    historyEntries.push({
      id: crypto.randomUUID(),
      timestamp: now,
      action: "closure_notes_updated",
      ...actor,
      details,
    });
  }

  if (historyEntries.length === 0) {
    return NextResponse.json({
      success: true,
      outcome,
      closure_notes: closureNotes,
      history_log: normalizeHistoryLog(existing.history_log),
    });
  }

  const history_log = [...normalizeHistoryLog(existing.history_log), ...historyEntries];
  const { error } = await service
    .from("help_requests")
    .update({
      outcome,
      closure_notes: closureNotes,
      history_log,
    })
    .eq("id", helpRequestId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    outcome,
    closure_notes: closureNotes,
    history_log,
  });
}
