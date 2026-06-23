import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

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

  const updates =
    decision === "confirm"
      ? { medical_flag_forced: true, medical_flag_dismissed: false }
      : { medical_flag_forced: false, medical_flag_dismissed: true };

  const service = await createServiceClient();
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
