import { NextRequest, NextResponse } from "next/server";
import { requireCaseWorker } from "@/lib/api/auth";
import { caseClaimBlockForId } from "@/lib/cases/case-claim-block";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireCaseWorker();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const helpRequestId =
    typeof body?.helpRequestId === "string" ? body.helpRequestId : undefined;
  const needed = body?.needed;

  if (!helpRequestId || typeof needed !== "boolean") {
    return NextResponse.json(
      { error: "Missing helpRequestId or needed flag." },
      { status: 400 }
    );
  }

  const service = await createServiceClient();
  const claimBlock = await caseClaimBlockForId({
    service,
    helpRequestId,
    profile: profile!,
  });
  if (claimBlock) return claimBlock;

  const { error } = await service
    .from("help_requests")
    .update({ needs_clinic_date: needed })
    .eq("id", helpRequestId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, needsClinicDate: needed });
}
