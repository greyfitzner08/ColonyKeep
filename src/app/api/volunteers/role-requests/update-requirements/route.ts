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
  const { data, error } = await service
    .from("volunteer_role_requests")
    .update({ [field]: value })
    .eq("id", requestId)
    .eq("status", "pending")
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ request: data });
}
