import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { fetchVolunteerRoleCatalogInputs } from "@/lib/volunteers/load-role-catalog";
import type { VolunteerApplication, VolunteerRole } from "@/lib/types";
import { mergeVolunteerRoles, rolesPendingApproval } from "@/lib/volunteers/role-expansion";
import { volunteerRequirementSource } from "@/lib/volunteers/requirement-source";
import {
  missingAdminVerifiableRequirementsForRole,
  requirementLabel,
} from "@/lib/volunteers/role-requirements";
import { tryAutoAssignTrapTeamForProfile } from "@/lib/volunteers/assign-team-by-home-zip";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const applicationId =
    typeof body.applicationId === "string" ? body.applicationId.trim() : "";
  const action = body.action === "reject" ? "reject" : "approve";

  if (!applicationId) {
    return errorResponse("Missing applicationId");
  }

  const service = await createServiceClient();
  const { catalog: roleCatalog } = await fetchVolunteerRoleCatalogInputs(service);

  const { data: application, error: appError } = await service
    .from("volunteer_applications")
    .select("*")
    .eq("id", applicationId)
    .single();

  if (appError || !application) {
    return errorResponse(appError?.message ?? "Volunteer application not found", 404);
  }

  const { data: volunteerProfile, error: profileError } = await service
    .from("profiles")
    .select("id, email, volunteer_roles, tnvr_certificate_uploaded, tnvr_certificate_url, team_id, home_zip")
    .eq("email", application.email.toLowerCase())
    .maybeSingle();

  if (profileError) {
    return errorResponse(profileError.message);
  }

  if (!volunteerProfile?.id) {
    return errorResponse("Approved volunteer profile not found for this application.");
  }

  const { data: pendingRoleRequests } = await service
    .from("volunteer_role_requests")
    .select("status, request_type, requested_roles")
    .eq("email", application.email.toLowerCase())
    .eq("status", "pending");

  const approvedRoles = (volunteerProfile.volunteer_roles ?? []) as VolunteerRole[];
  const rolesOverride = Array.isArray(body.volunteer_roles)
    ? (body.volunteer_roles as VolunteerRole[])
    : null;
  const requestedRoles =
    rolesOverride && rolesOverride.length > 0
      ? rolesOverride
      : rolesPendingApproval(
          application as VolunteerApplication,
          approvedRoles,
          pendingRoleRequests ?? []
        );

  if (requestedRoles.length === 0) {
    return errorResponse("No new volunteer roles are pending on this application.");
  }

  if (action === "reject") {
    const { error: updateError } = await service
      .from("volunteer_applications")
      .update({
        status: "approved",
        roles_requested: approvedRoles,
        reviewed_by: profile!.email,
        reviewed_at: new Date().toISOString(),
        admin_notes:
          typeof body.admin_notes === "string" && body.admin_notes.trim()
            ? body.admin_notes.trim()
            : application.admin_notes,
      })
      .eq("id", applicationId);

    if (updateError) {
      return errorResponse(updateError.message);
    }

    return NextResponse.json({ success: true, rejected_roles: requestedRoles });
  }

  const source = volunteerRequirementSource(
    application as VolunteerApplication,
    volunteerProfile
  );
  const blocked = requestedRoles
    .map((role) => ({
      role,
      missing: missingAdminVerifiableRequirementsForRole(role, source, roleCatalog),
    }))
    .filter((entry) => entry.missing.length > 0);

  if (blocked.length > 0) {
    const details = blocked
      .map((entry) => `${entry.role}: ${entry.missing.map(requirementLabel).join(", ")}`)
      .join("; ");
    return errorResponse(`Cannot approve yet — requirements still pending. ${details}`);
  }

  const mergedRoles = mergeVolunteerRoles(approvedRoles, requestedRoles);

  const { error: profileUpdateError } = await service
    .from("profiles")
    .update({
      volunteer_roles: mergedRoles,
      tnvr_certificate_uploaded:
        application.tnvr_certificate_uploaded || volunteerProfile.tnvr_certificate_uploaded,
      tnvr_certificate_url:
        application.tnvr_certificate_url ?? volunteerProfile.tnvr_certificate_url ?? null,
    })
    .eq("id", volunteerProfile.id);

  if (profileUpdateError) {
    return errorResponse(profileUpdateError.message);
  }

  const { error: applicationUpdateError } = await service
    .from("volunteer_applications")
    .update({
      status: "approved",
      roles_requested: mergedRoles,
      reviewed_by: profile!.email,
      reviewed_at: new Date().toISOString(),
      admin_notes:
        typeof body.admin_notes === "string" && body.admin_notes.trim()
          ? body.admin_notes.trim()
          : application.admin_notes,
    })
    .eq("id", applicationId);

  if (applicationUpdateError) {
    return errorResponse(applicationUpdateError.message);
  }

  try {
    await tryAutoAssignTrapTeamForProfile(service, volunteerProfile.id);
  } catch (assignError) {
    console.warn("[grant-roles] trap team auto-assign failed", assignError);
  }

  return NextResponse.json({
    success: true,
    volunteer_roles: mergedRoles,
    approved_roles: requestedRoles,
  });
}
