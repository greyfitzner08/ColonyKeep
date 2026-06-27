import { NextRequest, NextResponse } from "next/server";
import { requireCaseWorker } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

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
    .select("id, claimed_by_email, status, assigned_team_id")
    .eq("id", helpRequestId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: fetchError?.message ?? "Case not found" }, { status: 404 });
  }

  if (action === "unclaim") {
    if (!existing.claimed_by_email) {
      return NextResponse.json({ error: "This case is not claimed" }, { status: 400 });
    }

    const isOwner = existing.claimed_by_email === profile!.email;
    const isAdmin = profile!.role === "admin";
    if (!isOwner && !isAdmin) {
      return NextResponse.json(
        { error: "Only the person who claimed this case (or an admin) can unclaim it" },
        { status: 403 }
      );
    }

    const updates: Record<string, string | null> = {
      claimed_by_email: null,
      claimed_by_name: null,
    };

    if (existing.status === "claimed") {
      updates.status = existing.assigned_team_id ? "routed_to_trap_team" : "under_review";
    }

    const { error } = await service.from("help_requests").update(updates).eq("id", helpRequestId);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  }

  if (existing.claimed_by_email && existing.claimed_by_email !== profile!.email) {
    return NextResponse.json({ error: "This case is already assigned to someone else" }, { status: 409 });
  }

  const trapClaimStatuses = new Set(["routed_to_trap_team", "claimed"]);

  const updates: Record<string, string> = {
    claimed_by_email: profile!.email,
    claimed_by_name: profile!.full_name ?? profile!.email,
  };

  if (existing.status === "new_intake") {
    updates.status = "under_review";
  } else if (trapClaimStatuses.has(existing.status)) {
    updates.status = "claimed";
  }

  const { error } = await service.from("help_requests").update(updates).eq("id", helpRequestId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
