import { NextRequest, NextResponse } from "next/server";
import { requireCaseWorker } from "@/lib/api/auth";
import { intakeClaimRequiredResponse } from "@/lib/cases/intake-claim-api";
import {
  activeFollowUpNotes,
  normalizeHistoryLog,
  resolveFollowUpInHistory,
} from "@/lib/cases/history-log";
import { createServiceClient } from "@/lib/supabase/server";
import type { HelpRequestStatus } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireCaseWorker();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const helpRequestId = body?.help_request_id as string | undefined;
  const entryId = body?.entry_id as string | undefined;
  const entryTimestamp = body?.entry_timestamp as string | undefined;
  const resolveAll = body?.resolve_all === true;

  if (!helpRequestId) {
    return NextResponse.json({ error: "Missing help_request_id" }, { status: 400 });
  }

  if (!resolveAll && !entryId && !entryTimestamp) {
    return NextResponse.json(
      { error: "Provide entry_id, entry_timestamp, or resolve_all" },
      { status: 400 }
    );
  }

  const service = await createServiceClient();
  const { data: existing, error: loadError } = await service
    .from("help_requests")
    .select("history_log, follow_up_due_date, status, claimed_by_email")
    .eq("id", helpRequestId)
    .single();

  if (loadError || !existing) {
    return NextResponse.json(
      { error: loadError?.message ?? "Case not found" },
      { status: loadError ? 400 : 404 }
    );
  }

  const claimBlock = intakeClaimRequiredResponse({
    role: profile!.role,
    status: existing.status as HelpRequestStatus,
    claimedByEmail: existing.claimed_by_email,
    actorEmail: profile!.email,
  });
  if (claimBlock) return claimBlock;

  const history_log = resolveFollowUpInHistory(
    existing.history_log,
    resolveAll ? undefined : { id: entryId, timestamp: entryTimestamp }
  );

  const stillHasActiveFollowUp = activeFollowUpNotes(history_log).length > 0;
  const updatePayload: Record<string, unknown> = { history_log };

  if (resolveAll && existing.follow_up_due_date) {
    updatePayload.follow_up_due_date = null;
  } else if (!stillHasActiveFollowUp && existing.follow_up_due_date) {
    updatePayload.follow_up_due_date = null;
  }

  const completionEntry = {
    timestamp: new Date().toISOString(),
    action: "follow_up_completed",
    actor_email: profile!.email ?? null,
    actor_name: profile!.full_name ?? profile!.email ?? "Team member",
    details: resolveAll
      ? "Marked all follow-ups complete"
      : "Marked follow-up complete",
  };

  updatePayload.history_log = [...history_log, completionEntry];

  const { error: updateError } = await service
    .from("help_requests")
    .update(updatePayload)
    .eq("id", helpRequestId);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({
    history_log: normalizeHistoryLog(updatePayload.history_log),
    follow_up_due_date: updatePayload.follow_up_due_date ?? existing.follow_up_due_date,
  });
}
