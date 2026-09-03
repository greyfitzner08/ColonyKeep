import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { tryAutoAssignTrapTeamForProfile } from "@/lib/volunteers/assign-team-by-home-zip";

const ALLOWED_FIELDS = [
  "shadow_completed",
  "intake_training",
  "tnvr_certificate_uploaded",
  "event_crash_course",
] as const;

type AllowedField = (typeof ALLOWED_FIELDS)[number];

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const { applicationId, field, value } = body as {
    applicationId?: string;
    field?: AllowedField;
    value?: boolean;
  };

  if (!applicationId || !field || typeof value !== "boolean") {
    return NextResponse.json({ error: "Missing applicationId, field, or value" }, { status: 400 });
  }

  if (!ALLOWED_FIELDS.includes(field)) {
    return NextResponse.json({ error: "Invalid field" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: application, error: loadError } = await service
    .from("volunteer_applications")
    .select("id, email")
    .eq("id", applicationId)
    .single();

  if (loadError || !application) {
    return NextResponse.json(
      { error: loadError?.message ?? "Application not found" },
      { status: 404 }
    );
  }

  const { error } = await service
    .from("volunteer_applications")
    .update({
      [field]: value,
      reviewed_by: profile.email,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (value && (field === "shadow_completed" || field === "tnvr_certificate_uploaded")) {
    try {
      const { data: volunteerProfile } = await service
        .from("profiles")
        .select("id")
        .eq("email", application.email.toLowerCase())
        .maybeSingle();
      if (volunteerProfile?.id) {
        await tryAutoAssignTrapTeamForProfile(service, volunteerProfile.id);
      }
    } catch (assignError) {
      console.warn("[update-application] trap team auto-assign failed", assignError);
    }
  }

  return NextResponse.json({ success: true });
}
