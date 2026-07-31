import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { intakeClaimRequiredResponse } from "@/lib/cases/intake-claim-api";
import { createServiceClient } from "@/lib/supabase/server";
import type { HelpRequestStatus } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin", "inquiry_team"]);
  if (response) return response;

  const body = await request.json();
  const { helpRequestId, decision } = body as {
    helpRequestId?: string;
    decision?: "confirm" | "dismiss";
  };

  if (!helpRequestId || !decision) {
    return NextResponse.json({ error: "Missing helpRequestId or decision" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: existing, error: fetchError } = await service
    .from("help_requests")
    .select("id, status, claimed_by_email")
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

  const updates =
    decision === "confirm"
      ? { medical_flag_forced: true, medical_flag_dismissed: false }
      : { medical_flag_forced: false, medical_flag_dismissed: true };

  const { error } = await service.from("help_requests").update(updates).eq("id", helpRequestId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({
    success: true,
    reviewedBy: profile!.email,
    decision,
  });
}
