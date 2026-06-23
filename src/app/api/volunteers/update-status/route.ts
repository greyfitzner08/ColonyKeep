import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getEmailValidationError, parsePrimaryEmail } from "@/lib/email-utils";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const { applicationId, status, adminNotes } = body as {
    applicationId?: string;
    status?: "rejected" | "needs_followup";
    adminNotes?: string;
  };

  if (!applicationId || !status) {
    return NextResponse.json({ error: "Missing applicationId or status" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await service
    .from("volunteer_applications")
    .update({
      status,
      admin_notes: adminNotes?.trim() || null,
      reviewed_by: profile.email,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
