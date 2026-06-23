import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getEmailValidationError, parsePrimaryEmail } from "@/lib/email-utils";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const { applicationId, email, adminNotes } = body as {
    applicationId?: string;
    email?: string;
    adminNotes?: string;
  };

  if (!applicationId) {
    return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
  }

  const updates: Record<string, string | null> = {
    reviewed_by: profile.email,
    reviewed_at: new Date().toISOString(),
  };

  if (email !== undefined) {
    const normalizedEmail = parsePrimaryEmail(email);
    const emailError = getEmailValidationError(email);
    if (!normalizedEmail || emailError) {
      return NextResponse.json({ error: emailError ?? "Invalid email address" }, { status: 400 });
    }
    updates.email = normalizedEmail;
  }

  if (adminNotes !== undefined) {
    updates.admin_notes = adminNotes.trim() || null;
  }

  if (Object.keys(updates).length === 2) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await service
    .from("volunteer_applications")
    .update(updates)
    .eq("id", applicationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
