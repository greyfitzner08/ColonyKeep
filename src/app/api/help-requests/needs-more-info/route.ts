import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { intakeClaimRequiredResponse } from "@/lib/cases/intake-claim-api";
import { createServiceClient } from "@/lib/supabase/server";
import type { HelpRequestStatus, HistoryEntry } from "@/lib/types";

const NEEDS_INFO_FROM_STATUSES = new Set<HelpRequestStatus>(["new_intake", "under_review"]);

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
    .select("id, status, history_log, claimed_by_email")
    .eq("id", helpRequestId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: fetchError?.message ?? "Case not found" }, { status: 404 });
  }

  const status = existing.status as HelpRequestStatus;
  if (!NEEDS_INFO_FROM_STATUSES.has(status)) {
    return NextResponse.json(
      { error: "Only new or in-review inquiry cases can be marked as needing more information." },
      { status: 400 }
    );
  }

  const claimBlock = intakeClaimRequiredResponse({
    role: profile!.role,
    status,
    claimedByEmail: existing.claimed_by_email,
    actorEmail: profile!.email,
  });
  if (claimBlock) return claimBlock;

  const historyEntry: HistoryEntry = {
    timestamp: new Date().toISOString(),
    action: "needs_more_info",
    actor_email: profile!.email,
    actor_name: profile!.full_name ?? profile!.email,
    details: "Marked as needing more information from reporter",
  };

  const historyLog = [...(existing.history_log ?? []), historyEntry];

  const { error } = await service
    .from("help_requests")
    .update({
      status: "needs_more_info",
      history_log: historyLog,
    })
    .eq("id", helpRequestId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
