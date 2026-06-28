import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { VolunteerRole } from "@/lib/types";
import { syncApplicationForRoleRequests } from "@/lib/volunteers/role-expansion";
import { includesTrapVolunteerRole } from "@/lib/volunteers/role-requirements";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole([
    "admin",
    "volunteer",
    "inquiry_team",
    "trap_team_lead",
  ]);
  if (response) return response;

  const body = await request.json();
  const requestedRoles = (body.requested_roles ?? []) as VolunteerRole[];
  const requestType = (body.request_type ?? "add") as "add" | "remove";

  if (requestedRoles.length === 0) {
    return NextResponse.json({ error: "Select at least one role" }, { status: 400 });
  }

  if (requestType !== "add" && requestType !== "remove") {
    return NextResponse.json({ error: "Invalid request type" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: application } = await service
    .from("volunteer_applications")
    .select("*")
    .eq("email", profile!.email)
    .maybeSingle();

  const currentRoles = (profile!.volunteer_roles ?? []) as VolunteerRole[];

  if (requestType === "remove") {
    const invalid = requestedRoles.filter((role) => !currentRoles.includes(role));
    if (invalid.length > 0) {
      return NextResponse.json(
        { error: "You can only request removal of roles you currently hold." },
        { status: 400 }
      );
    }
  } else {
    const alreadyHeld = requestedRoles.filter((role) => currentRoles.includes(role));
    if (alreadyHeld.length > 0) {
      return NextResponse.json(
        { error: "You already have one or more of the selected roles." },
        { status: 400 }
      );
    }
  }

  const trapRoleExpansion = requestType === "add" && includesTrapVolunteerRole(requestedRoles);

  const requirementSnapshot = {
    tnvr_certificate_uploaded: trapRoleExpansion
      ? false
      : (application?.tnvr_certificate_uploaded ?? profile!.tnvr_certificate_uploaded ?? false),
    tnvr_certificate_url: trapRoleExpansion
      ? null
      : (application?.tnvr_certificate_url ?? profile!.tnvr_certificate_url ?? null),
    intake_training: application?.intake_training ?? false,
    shadow_completed: trapRoleExpansion ? false : (application?.shadow_completed ?? false),
    liability_waiver_signed: application?.liability_waiver_signed ?? false,
    policy_signed: application?.policy_signed ?? false,
    event_crash_course: application?.event_crash_course ?? false,
  };

  const { data, error } = await service
    .from("volunteer_role_requests")
    .insert({
      profile_id: profile!.id,
      application_id: application?.id ?? null,
      email: profile!.email,
      full_name: profile!.full_name,
      requested_roles: requestedRoles,
      request_type: requestType,
      status: "pending",
      ...requirementSnapshot,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (requestType === "add") {
    await syncApplicationForRoleRequests(service, profile!.email, profile!);
  }

  return NextResponse.json({ request: data });
}
