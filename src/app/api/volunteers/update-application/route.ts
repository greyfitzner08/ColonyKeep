import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

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

  return NextResponse.json({ success: true });
}
