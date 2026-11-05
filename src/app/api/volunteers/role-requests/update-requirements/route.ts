import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { RequirementField } from "@/lib/volunteers/role-requirements";

const ALLOWED_FIELDS = new Set<RequirementField>([
  "liability_waiver_signed",
  "policy_signed",
  "shadow_completed",
  "intake_training",
  "tnvr_certificate_uploaded",
  "event_crash_course",
  "adoption_training",
]);

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const requestId = body.request_id as string | undefined;
  const field = body.field as RequirementField | undefined;
  const value = Boolean(body.value);

  if (!requestId || !field || !ALLOWED_FIELDS.has(field)) {
    return NextResponse.json({ error: "Invalid request_id or field" }, { status: 400 });
  }

  const service = await createServiceClient();

  const patch: Record<string, boolean | string | null> = { [field]: value };

  // When admin confirms certificate on a role request, attach any existing file
  // from the application/profile so review doesn't show "no certificate file".
  if (field === "tnvr_certificate_uploaded" && value) {
    const { data: roleRequest } = await service
      .from("volunteer_role_requests")
      .select("id, email, tnvr_certificate_url")
      .eq("id", requestId)
      .maybeSingle();

    if (roleRequest && !roleRequest.tnvr_certificate_url) {
      const email = roleRequest.email.toLowerCase();
      const [{ data: application }, { data: profile }] = await Promise.all([
        service
          .from("volunteer_applications")
          .select("tnvr_certificate_url")
          .ilike("email", email)
          .maybeSingle(),
        service
          .from("profiles")
          .select("tnvr_certificate_url")
          .ilike("email", email)
          .maybeSingle(),
      ]);
      const existingUrl =
        application?.tnvr_certificate_url || profile?.tnvr_certificate_url || null;
      if (existingUrl) {
        patch.tnvr_certificate_url = existingUrl;
      }
    }
  }

  const { data, error } = await service
    .from("volunteer_role_requests")
    .update(patch)
    .eq("id", requestId)
    .eq("status", "pending")
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ request: data });
}
