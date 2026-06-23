import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { VolunteerRole } from "@/lib/types";
import { rolesNeedingTnvrCert } from "@/lib/volunteers/role-requirements";

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
  const requestedRoles = (body.requested_roles ?? []) as VolunteerRole[];
  if (requestedRoles.length === 0) {
    return NextResponse.json({ error: "Select at least one role" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: application } = await service
    .from("volunteer_applications")
    .select("*")
    .eq("email", profile!.email)
    .maybeSingle();

  const hasTnvrCert = Boolean(
    application?.tnvr_certificate_uploaded || profile!.tnvr_certificate_uploaded
  );
  if (rolesNeedingTnvrCert(requestedRoles) && !hasTnvrCert) {
    return NextResponse.json(
      { error: "Upload your TNVR certificate before requesting trapping-related roles." },
      { status: 400 }
    );
  }

  const { data, error } = await service
    .from("volunteer_role_requests")
    .insert({
      profile_id: profile!.id,
      application_id: application?.id ?? null,
      email: profile!.email,
      full_name: profile!.full_name,
      requested_roles: requestedRoles,
      status: "pending",
      tnvr_certificate_uploaded:
        application?.tnvr_certificate_uploaded ?? profile!.tnvr_certificate_uploaded ?? false,
      tnvr_certificate_url:
        application?.tnvr_certificate_url ?? profile!.tnvr_certificate_url ?? null,
      intake_training: application?.intake_training ?? false,
      shadow_completed: application?.shadow_completed ?? false,
      liability_waiver_signed: application?.liability_waiver_signed ?? false,
      policy_signed: application?.policy_signed ?? false,
      event_crash_course: application?.event_crash_course ?? false,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ request: data });
}
