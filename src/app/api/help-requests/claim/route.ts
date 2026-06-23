import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole([
    "admin",
    "inquiry_team",
    "trap_team_lead",
    "volunteer",
  ]);
  if (response) return response;

  const body = await request.json();
  const { helpRequestId } = body as { helpRequestId?: string };

  if (!helpRequestId) {
    return NextResponse.json({ error: "Missing helpRequestId" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: existing, error: fetchError } = await service
    .from("help_requests")
    .select("id, claimed_by_email, status")
    .eq("id", helpRequestId)
    .single();

  if (fetchError || !existing) {
    return NextResponse.json({ error: fetchError?.message ?? "Case not found" }, { status: 404 });
  }

  if (existing.claimed_by_email && existing.claimed_by_email !== profile!.email) {
    return NextResponse.json({ error: "This case is already assigned to someone else" }, { status: 409 });
  }

  const updates: Record<string, string> = {
    claimed_by_email: profile!.email,
    claimed_by_name: profile!.full_name ?? profile!.email,
  };

  if (existing.status === "new_intake") {
    updates.status = "under_review";
  } else if (existing.status === "routed_to_trap_team") {
    updates.status = "claimed";
  }

  const { error } = await service
    .from("help_requests")
    .update(updates)
    .eq("id", helpRequestId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
