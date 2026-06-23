import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole([
    "admin",
    "volunteer",
    "inquiry_team",
    "trap_team_lead",
    "clinic_coordination",
  ]);
  if (response) return response;

  const body = await request.json();
  const certificateUrl = typeof body.certificate_url === "string" ? body.certificate_url.trim() : "";

  if (!certificateUrl) {
    return NextResponse.json({ error: "Missing certificate_url" }, { status: 400 });
  }

  const service = await createServiceClient();
  const email = profile!.email.toLowerCase();

  const { data: application, error: appError } = await service
    .from("volunteer_applications")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (appError) {
    return NextResponse.json({ error: appError.message }, { status: 400 });
  }

  if (application) {
    const { error: updateAppError } = await service
      .from("volunteer_applications")
      .update({
        tnvr_certificate_uploaded: true,
        tnvr_certificate_url: certificateUrl,
      })
      .eq("id", application.id);

    if (updateAppError) {
      return NextResponse.json({ error: updateAppError.message }, { status: 400 });
    }
  }

  const { error: roleRequestError } = await service
    .from("volunteer_role_requests")
    .update({
      tnvr_certificate_uploaded: true,
      tnvr_certificate_url: certificateUrl,
    })
    .eq("email", email)
    .eq("status", "pending");

  if (roleRequestError) {
    return NextResponse.json({ error: roleRequestError.message }, { status: 400 });
  }

  const { error: profileError } = await service
    .from("profiles")
    .update({
      tnvr_certificate_uploaded: true,
      tnvr_certificate_url: certificateUrl,
    })
    .eq("id", profile!.id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, certificate_url: certificateUrl });
}
