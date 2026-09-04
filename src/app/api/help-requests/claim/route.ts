import { NextRequest, NextResponse } from "next/server";
import { requireCaseWorker } from "@/lib/api/auth";
import { canShowIntakeClaimActions } from "@/lib/cases/case-assignment";
import { isIntakeQueueStatus } from "@/lib/cases/statuses";
import { normalizeHistoryLog } from "@/lib/cases/history-log";
import { createServiceClient } from "@/lib/supabase/server";
import type { HelpRequestStatus, HistoryEntry } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireCaseWorker();
  if (response) return response;

  const body = await request.json();
  const { helpRequestId, action = "claim" } = body as {
    helpRequestId?: string;
    action?: "claim" | "unclaim";
  };

  if (!helpRequestId) {
    return NextResponse.json({ error: "Missing helpRequestId" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: existing, error: fetchError } = await service
    .from("help_requests")
    .select("id, claimed_by_email, status, assigned_team_id, history_log")
    .eq("id", helpRequestId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: fetchError?.message ?? "Case not found" }, { status: 404 });
  }

  const status = existing.status as HelpRequestStatus;
  const actorEmail = profile!.email ?? "";
  const actorName = profile!.full_name ?? profile!.email ?? "";
  const priorHistory = normalizeHistoryLog(existing.history_log);
  const recordInquiryHistory =
    profile!.role === "inquiry_team" || isIntakeQueueStatus(status);

  function appendHistory(actionName: "claim" | "unclaim", details: string): HistoryEntry[] | undefined {
    if (!recordInquiryHistory || !actorEmail.trim()) return undefined;
    const entry: HistoryEntry = {
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
      action: actionName,
      actor_email: actorEmail,
      actor_name: actorName,
      details,
    };
    return [...priorHistory, entry];
  }

  if (action === "unclaim") {
    if (!existing.claimed_by_email) {
      return NextResponse.json({ error: "This case is not claimed" }, { status: 400 });
    }

    const isOwner = existing.claimed_by_email === profile!.email;
    const isAdmin = profile!.role === "admin";
    const canManageClaim = canShowIntakeClaimActions(profile!.role, status);

    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Only the person who claimed this case (or an admin) can unclaim it" },
        { status: 403 }
      );
    }

    if (!canManageClaim && !isAdmin) {
      return NextResponse.json(
        { error: "This case is no longer in the inquiry queue." },
        { status: 400 }
      );
    }

    const updates: Record<string, unknown> = {
      claimed_by_email: null,
      claimed_by_name: null,
    };

    // Releasing a claim must also release the stage it implied, or the case looks
    // "in review" / "claimed" with nobody working it.
    if (status === "claimed") {
      updates.status = "routed_to_trap_team";
    } else if (status === "under_review") {
      updates.status = "new_intake";
    }

    const history_log = appendHistory("unclaim", "Released inquiry claim");
    if (history_log) updates.history_log = history_log;

    const { error } = await service.from("help_requests").update(updates).eq("id", helpRequestId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  if (existing.claimed_by_email && existing.claimed_by_email !== profile!.email) {
    return NextResponse.json({ error: "This case is already assigned to someone else" }, { status: 409 });
  }

  if (!canShowIntakeClaimActions(profile!.role, status)) {
    return NextResponse.json(
      { error: "Inquiry team can only claim cases still in the inquiry queue." },
      { status: 400 }
    );
  }

  const trapClaimStatuses = new Set(["routed_to_trap_team", "claimed"]);

  const updates: Record<string, unknown> = {
    claimed_by_email: profile!.email,
    claimed_by_name: profile!.full_name ?? profile!.email,
  };

  if (status === "new_intake") {
    updates.status = "under_review";
  } else if (trapClaimStatuses.has(status)) {
    updates.status = "claimed";
  }

  const history_log = appendHistory(
    "claim",
    isIntakeQueueStatus(status) ? "Claimed for inquiry review" : "Claimed for trap work"
  );
  if (history_log) updates.history_log = history_log;

  const { error } = await service.from("help_requests").update(updates).eq("id", helpRequestId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
