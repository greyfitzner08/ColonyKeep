import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getEmailValidationError, parsePrimaryEmail } from "@/lib/email-utils";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const { applicationId, email, fullName, adminNotes } = body as {
    applicationId?: string;
    email?: string;
    fullName?: string;
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

  if (fullName !== undefined) {
    const trimmed = fullName.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    updates.full_name = trimmed;
  }

  if (adminNotes !== undefined) {
    updates.admin_notes = adminNotes.trim() || null;
  }

  if (Object.keys(updates).length === 2) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const service = await createServiceClient();

  const { data: existingApplication, error: loadError } = await service
    .from("volunteer_applications")
    .select("email")
    .eq("id", applicationId)
    .single();

  if (loadError || !existingApplication) {
    return NextResponse.json({ error: "Volunteer application not found" }, { status: 404 });
  }

  const { error } = await service
    .from("volunteer_applications")
    .update(updates)
    .eq("id", applicationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (updates.full_name) {
    const profileEmail = updates.email ?? existingApplication.email;
    await service
      .from("profiles")
      .update({ full_name: updates.full_name })
      .eq("email", profileEmail);
  }

  return NextResponse.json({ success: true });
}
