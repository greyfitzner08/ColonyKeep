import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const { applicationId, status } = body as {
    applicationId?: string;
    status?: "rejected" | "needs_followup";
  };

  if (!applicationId || !status) {
    return NextResponse.json({ error: "Missing applicationId or status" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await service
    .from("volunteer_applications")
    .update({
      status,
      reviewed_by: profile.email,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
