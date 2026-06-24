import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { VolunteerRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const requestId = body.request_id as string | undefined;
  const action = body.action as "approve" | "reject" | undefined;

  if (!requestId || !action) {
    return NextResponse.json({ error: "Missing request_id or action" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: roleRequest, error: fetchError } = await service
    .from("volunteer_role_requests")
    .select("*")
    .eq("id", requestId)
    .single();

  if (fetchError || !roleRequest) {
    return NextResponse.json({ error: "Role request not found" }, { status: 404 });
  }

  if (action === "reject") {
    const { data, error } = await service
      .from("volunteer_role_requests")
      .update({
        status: "rejected",
        reviewed_by: profile!.email,
        reviewed_at: new Date().toISOString(),
        admin_notes: body.admin_notes ?? null,
      })
      .eq("id", requestId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ request: data });
  }

  if (!roleRequest.profile_id) {
    return NextResponse.json({ error: "Volunteer profile not linked" }, { status: 400 });
  }

  const { data: existingProfile } = await service
    .from("profiles")
    .select("volunteer_roles, role")
    .eq("id", roleRequest.profile_id)
    .single();

  const currentRoles = (existingProfile?.volunteer_roles ?? []) as VolunteerRole[];
  const requestType = (roleRequest.request_type ?? "add") as "add" | "remove";

  const mergedRoles =
    requestType === "remove"
      ? currentRoles.filter((role) => !roleRequest.requested_roles.includes(role))
      : Array.from(new Set([...currentRoles, ...((roleRequest.requested_roles ?? []) as VolunteerRole[])]));

  const { error: profileError } = await service
    .from("profiles")
    .update({ volunteer_roles: mergedRoles })
    .eq("id", roleRequest.profile_id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const { data, error } = await service
    .from("volunteer_role_requests")
    .update({
      status: "approved",
      reviewed_by: profile!.email,
      reviewed_at: new Date().toISOString(),
      admin_notes: body.admin_notes ?? null,
    })
    .eq("id", requestId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  return NextResponse.json({ request: data, volunteer_roles: mergedRoles });
}
