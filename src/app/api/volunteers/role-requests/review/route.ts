import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { RoleDescription, VolunteerApplication, VolunteerRole } from "@/lib/types";
import { resolveVolunteerRoleCatalog } from "@/lib/volunteers/role-catalog";
import {
  markApplicationApprovedAfterRoleGrant,
  mergeVolunteerRoles,
  partitionRolesByRequirements,
  requirementSourceForRoleRequest,
  syncApplicationForRoleRequests,
} from "@/lib/volunteers/role-expansion";
import { missingRequirementsForRole, requirementLabel } from "@/lib/volunteers/role-requirements";

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
  const { data: roleDescriptions } = await service.from("role_descriptions").select("*");
  const roleCatalog = resolveVolunteerRoleCatalog((roleDescriptions ?? []) as RoleDescription[]);

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

    const { data: existingProfile } = roleRequest.profile_id
      ? await service
          .from("profiles")
          .select("volunteer_roles, tnvr_certificate_uploaded, tnvr_certificate_url")
          .eq("id", roleRequest.profile_id)
          .maybeSingle()
      : { data: null };

    if (existingProfile) {
      await syncApplicationForRoleRequests(service, roleRequest.email, existingProfile);
    }

    return NextResponse.json({ request: data });
  }

  if (!roleRequest.profile_id) {
    return NextResponse.json({ error: "Volunteer profile not linked" }, { status: 400 });
  }

  const { data: existingProfile } = await service
    .from("profiles")
    .select("volunteer_roles, role, tnvr_certificate_uploaded, tnvr_certificate_url")
    .eq("id", roleRequest.profile_id)
    .single();

  if (!existingProfile) {
    return NextResponse.json({ error: "Volunteer profile not found" }, { status: 404 });
  }

  const { data: application } = await service
    .from("volunteer_applications")
    .select("*")
    .eq("email", roleRequest.email.toLowerCase())
    .maybeSingle();

  const currentRoles = (existingProfile.volunteer_roles ?? []) as VolunteerRole[];
  const requestType = (roleRequest.request_type ?? "add") as "add" | "remove";

  if (requestType === "remove") {
    const mergedRoles = currentRoles.filter(
      (role) => !roleRequest.requested_roles.includes(role)
    );

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

    await markApplicationApprovedAfterRoleGrant(
      service,
      roleRequest.email,
      mergedRoles as VolunteerRole[]
    );

    return NextResponse.json({ request: data, volunteer_roles: mergedRoles });
  }

  const source = requirementSourceForRoleRequest(
    (application as VolunteerApplication | null) ?? null,
    existingProfile,
    roleRequest
  );
  const requestedRoles = (roleRequest.requested_roles ?? []) as VolunteerRole[];
  const { ready, pending } = partitionRolesByRequirements(requestedRoles, source, roleCatalog);

  if (ready.length === 0) {
    const details = requestedRoles
      .map((role) => {
        const missing = missingRequirementsForRole(role, source, roleCatalog);
        return `${role}: ${missing.map(requirementLabel).join(", ")}`;
      })
      .join("; ");
    return NextResponse.json(
      {
        error: `Cannot approve yet — requirements still pending. ${details}`,
      },
      { status: 400 }
    );
  }

  const mergedRoles = mergeVolunteerRoles(currentRoles, ready);

  const { error: profileError } = await service
    .from("profiles")
    .update({
      volunteer_roles: mergedRoles,
      tnvr_certificate_uploaded:
        source.tnvr_certificate_uploaded || existingProfile.tnvr_certificate_uploaded,
      tnvr_certificate_url:
        roleRequest.tnvr_certificate_url ?? existingProfile.tnvr_certificate_url ?? null,
    })
    .eq("id", roleRequest.profile_id);

  if (profileError) {
    return NextResponse.json({ error: profileError.message }, { status: 400 });
  }

  const reviewer = profile!.email;
  const reviewedAt = new Date().toISOString();
  const partialNote =
    pending.length > 0
      ? `Approved ${ready.join(", ")}. Still waiting on requirements for ${pending.join(", ")}.`
      : null;

  let updatedRequest;
  if (pending.length > 0) {
    const { data, error } = await service
      .from("volunteer_role_requests")
      .update({
        requested_roles: pending,
        status: "pending",
        reviewed_by: reviewer,
        reviewed_at: reviewedAt,
        admin_notes: body.admin_notes ?? partialNote,
        ...source,
      })
      .eq("id", requestId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    updatedRequest = data;
  } else {
    const { data, error } = await service
      .from("volunteer_role_requests")
      .update({
        status: "approved",
        reviewed_by: reviewer,
        reviewed_at: reviewedAt,
        admin_notes: body.admin_notes ?? null,
      })
      .eq("id", requestId)
      .select()
      .single();

    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    updatedRequest = data;
  }

  await syncApplicationForRoleRequests(service, roleRequest.email, {
    volunteer_roles: mergedRoles,
    tnvr_certificate_uploaded:
      source.tnvr_certificate_uploaded || existingProfile.tnvr_certificate_uploaded,
    tnvr_certificate_url:
      roleRequest.tnvr_certificate_url ?? existingProfile.tnvr_certificate_url ?? null,
  });

  if (pending.length === 0) {
    await markApplicationApprovedAfterRoleGrant(
      service,
      roleRequest.email,
      mergedRoles
    );
  }

  return NextResponse.json({
    request: updatedRequest,
    volunteer_roles: mergedRoles,
    approved_roles: ready,
    pending_roles: pending,
    warning: partialNote,
  });
}
