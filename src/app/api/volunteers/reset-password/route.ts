import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { parsePrimaryEmail, getEmailValidationError } from "@/lib/email-utils";
import { resetVolunteerTemporaryPassword } from "@/lib/volunteers/approve-auth";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const applicationId = body.application_id as string | undefined;

  if (!applicationId) {
    return NextResponse.json({ error: "Missing application_id" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: application, error: appError } = await service
    .from("volunteer_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (appError || !application) {
    return NextResponse.json({ error: "Volunteer application not found" }, { status: 404 });
  }

  if (application.status !== "approved") {
    return NextResponse.json(
      { error: "Only approved volunteers can have their login password reset." },
      { status: 400 }
    );
  }

  const volunteerEmail = parsePrimaryEmail(application.email);
  const emailError = getEmailValidationError(application.email);
  if (!volunteerEmail || emailError) {
    return NextResponse.json({ error: emailError ?? "Invalid email on application" }, { status: 400 });
  }

  const authResult = await resetVolunteerTemporaryPassword(
    service,
    volunteerEmail,
    application.full_name
  );

  if ("error" in authResult) {
    return NextResponse.json({ error: authResult.error }, { status: 400 });
  }

  const { userId, created } = authResult;

  const { data: existingProfile } = await service
    .from("profiles")
    .select("id")
    .eq("email", volunteerEmail)
    .maybeSingle();

  if (existingProfile) {
    const { error: profileError } = await service
      .from("profiles")
      .update({ must_change_password: true })
      .eq("id", existingProfile.id);

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }
  } else {
    const { error: profileError } = await service.from("profiles").insert({
      id: userId,
      email: volunteerEmail,
      full_name: application.full_name,
      role: "volunteer",
      must_change_password: true,
      volunteer_roles: application.roles_requested ?? [],
    });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }
  }

  return NextResponse.json({
    success: true,
    created_account: created,
    message: created
      ? "Login account created with the temporary password. Share FeralFelines123! with the volunteer so they can sign in and choose a new password."
      : "Password reset to the temporary default. Share FeralFelines123! with the volunteer so they can sign in and choose a new password.",
  });
}
