import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestAppUrl } from "@/lib/app-url";
import { getEmailValidationError, parsePrimaryEmail } from "@/lib/email-utils";
import { ensureVolunteerAuthUser } from "@/lib/volunteers/approve-auth";
import { canAssignVolunteerToTeam, hasTrapTeamMemberRoles } from "@/lib/volunteers/eligibility";
import { isUnder18, isRoleAllowedOnSignup } from "@/lib/volunteers/age-eligibility";
import { isKnownUserRole } from "@/lib/constants";
import type { UserRole, VolunteerRole } from "@/lib/types";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

export async function POST(request: NextRequest) {
  try {
    const { profile, response } = await requireApiRole(["admin"]);
    if (response) return response;

    const body = await request.json();
    const { applicationId, teamId, email: emailOverride, volunteer_roles: volunteerRolesOverride, platformRole } =
      body as {
        applicationId?: string;
        teamId?: string | null;
        email?: string;
        volunteer_roles?: VolunteerRole[];
        platformRole?: UserRole;
      };

    if (!applicationId) {
      return errorResponse("Missing application ID");
    }

    const service = await createServiceClient();
    const appUrl = getRequestAppUrl(request);

    const { data: application, error: appError } = await service
      .from("volunteer_applications")
      .select()
      .eq("id", applicationId)
      .single();

    if (appError || !application) {
      return errorResponse(appError?.message ?? "Volunteer application not found");
    }

    const rawEmail =
      typeof emailOverride === "string" && emailOverride.trim()
        ? emailOverride
        : application.email;
    const volunteerEmail = parsePrimaryEmail(rawEmail);
    const emailError = getEmailValidationError(rawEmail);

    if (!volunteerEmail || emailError) {
      return errorResponse(
        emailError ??
          "This application has an invalid email address. Edit the email, save it, and try again."
      );
    }

    if (volunteerEmail !== String(application.email ?? "").trim().toLowerCase()) {
      const { error: emailUpdateError } = await service
        .from("volunteer_applications")
        .update({ email: volunteerEmail })
        .eq("id", applicationId);

      if (emailUpdateError) {
        return errorResponse(`Could not update volunteer email: ${emailUpdateError.message}`);
      }
    }

    const authResult = await ensureVolunteerAuthUser(
      service,
      volunteerEmail,
      application.full_name,
      appUrl
    );

    if ("error" in authResult) {
      return errorResponse(authResult.error);
    }

    const { userId, isNewUser } = authResult;

    const { data: existingProfile } = await service
      .from("profiles")
      .select("id, role, volunteer_roles, team_id, tnvr_certificate_uploaded, tnvr_certificate_url")
      .eq("email", volunteerEmail)
      .maybeSingle();

    const applicationRoles = (
      Array.isArray(volunteerRolesOverride)
        ? (volunteerRolesOverride as VolunteerRole[])
        : ((application.roles_requested ?? []) as VolunteerRole[])
    ).filter((entry) => entry !== "youth_volunteer");

    const invalidRole = applicationRoles.find(
      (entry) => !isRoleAllowedOnSignup(entry, application.birthday)
    );
    if (invalidRole) {
      return errorResponse(`Role "${invalidRole}" is not allowed for this volunteer.`);
    }

    if (applicationRoles.length === 0) {
      return errorResponse("Select at least one volunteer role to approve.");
    }

    if (teamId) {
      const approvalProfile = {
        volunteer_roles: applicationRoles,
        roles_requested: applicationRoles,
      };
      if (!hasTrapTeamMemberRoles(approvalProfile, { roles_requested: applicationRoles })) {
        return errorResponse(
          "Trap team assignment requires a trapping, transport, recovery, or colony support role."
        );
      }
      if (!canAssignVolunteerToTeam(application, approvalProfile)) {
        return errorResponse(
          "Check off TNVR certificate and shadow training before assigning a trap team."
        );
      }
    }

    const youthPermission: VolunteerRole[] =
      application.birthday && isUnder18(application.birthday) ? ["youth_volunteer"] : [];

    const mergedVolunteerRoles = Array.from(
      new Set([
        ...((existingProfile?.volunteer_roles ?? []) as VolunteerRole[]),
        ...applicationRoles,
        ...youthPermission,
      ])
    );

    const resolvedPlatformRole: UserRole =
      platformRole && isKnownUserRole(platformRole) ? platformRole : "volunteer";

    if (existingProfile) {
      const { error: profileUpdateError } = await service
        .from("profiles")
        .update({
          role:
            platformRole && isKnownUserRole(platformRole)
              ? platformRole
              : existingProfile.role || "volunteer",
          ...(teamId ? { team_id: teamId } : {}),
          full_name: application.full_name,
          birthday: application.birthday ?? null,
          phone: application.phone ?? null,
          home_street: application.home_street ?? null,
          home_city: application.home_city ?? null,
          home_state: application.home_state ?? null,
          home_zip: application.home_zip ?? null,
          home_county: application.home_county ?? null,
          volunteer_roles: mergedVolunteerRoles,
          tnvr_certificate_uploaded:
            application.tnvr_certificate_uploaded ??
            existingProfile.tnvr_certificate_uploaded ??
            false,
          tnvr_certificate_url:
            application.tnvr_certificate_url ?? existingProfile.tnvr_certificate_url ?? null,
          ...(isNewUser ? { must_change_password: true } : {}),
        })
        .eq("id", existingProfile.id);

      if (profileUpdateError) {
        return errorResponse(`Could not update volunteer profile: ${profileUpdateError.message}`);
      }
    } else {
      const { error: profileError } = await service.from("profiles").insert({
        id: userId,
        email: volunteerEmail,
        full_name: application.full_name,
        birthday: application.birthday ?? null,
        phone: application.phone ?? null,
        home_street: application.home_street ?? null,
        home_city: application.home_city ?? null,
        home_state: application.home_state ?? null,
        home_zip: application.home_zip ?? null,
        home_county: application.home_county ?? null,
        role: resolvedPlatformRole,
        team_id: teamId ?? null,
        volunteer_roles: mergedVolunteerRoles,
        tnvr_certificate_uploaded: application.tnvr_certificate_uploaded ?? false,
        tnvr_certificate_url: application.tnvr_certificate_url ?? null,
        must_change_password: isNewUser,
      });

      if (profileError) {
        return errorResponse(`Could not create volunteer profile: ${profileError.message}`);
      }
    }

    if (teamId) {
      const { data: team, error: teamError } = await service
        .from("trap_teams")
        .select("members")
        .eq("id", teamId)
        .single();

      if (teamError) {
        return errorResponse(`Could not load trap team: ${teamError.message}`);
      }

      const members = team?.members ?? [];
      if (!members.includes(volunteerEmail)) {
        const { error: teamUpdateError } = await service
          .from("trap_teams")
          .update({ members: [...members, volunteerEmail] })
          .eq("id", teamId);

        if (teamUpdateError) {
          return errorResponse(`Could not add volunteer to team: ${teamUpdateError.message}`);
        }
      }
    }

    const reviewer = profile!.email ?? profile!.full_name ?? "admin";
    const { error: approvalError } = await service
      .from("volunteer_applications")
      .update({
        status: "approved",
        roles_requested: applicationRoles,
        reviewed_by: reviewer,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (approvalError) {
      return errorResponse(`Could not mark application approved: ${approvalError.message}`);
    }

    return NextResponse.json({
      success: true,
      is_new_user: isNewUser,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while approving the volunteer.";
    return errorResponse(message, 500);
  }
}
