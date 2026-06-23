import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { getRequestAppUrl } from "@/lib/app-url";
import { formatAuthError, isAlreadyRegisteredAuthError } from "@/lib/auth-errors";
import { getEmailValidationError, parsePrimaryEmail } from "@/lib/email-utils";
import { sendVolunteerApprovalEmail } from "@/lib/email";
import type { SupabaseClient } from "@supabase/supabase-js";

function errorResponse(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

async function findAuthUserIdByEmail(service: SupabaseClient, email: string) {
  const { data, error } = await service.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (error) return null;
  return data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())?.id ?? null;
}

async function ensureAuthUser(
  service: SupabaseClient,
  email: string,
  fullName: string,
  redirectTo: string
) {
  const inviteResult = await service.auth.admin.generateLink({
    type: "invite",
    email,
    options: {
      data: { full_name: fullName },
      redirectTo,
    },
  });

  if (!inviteResult.error && inviteResult.data.user?.id) {
    return {
      userId: inviteResult.data.user.id,
      passwordSetupUrl: inviteResult.data.properties?.action_link ?? null,
    };
  }

  if (inviteResult.error && !isAlreadyRegisteredAuthError(inviteResult.error)) {
    const createResult = await service.auth.admin.createUser({
      email,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (createResult.error && !isAlreadyRegisteredAuthError(createResult.error)) {
      const createMessage =
        createResult.error.message?.trim() ||
        formatAuthError(createResult.error, redirectTo);
      return {
        error: `Could not create volunteer login: ${createMessage}`,
      };
    }
  }

  const recoveryResult = await service.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo },
  });

  if (recoveryResult.error) {
    const existingUserId = await findAuthUserIdByEmail(service, email);
    if (existingUserId) {
      return {
        userId: existingUserId,
        passwordSetupUrl: null,
        warning:
          "Volunteer account exists but password setup link could not be generated. Ask them to use Forgot Password on the login page.",
      };
    }

    return {
      error: formatAuthError(recoveryResult.error, redirectTo),
    };
  }

  if (!recoveryResult.data.user?.id) {
    return { error: "Supabase did not return a user account for this volunteer." };
  }

  return {
    userId: recoveryResult.data.user.id,
    passwordSetupUrl: recoveryResult.data.properties?.action_link ?? null,
  };
}

export async function POST(request: NextRequest) {
  try {
    const { profile, response } = await requireApiRole(["admin"]);
    if (response) return response;

    const body = await request.json();
    const { applicationId, role, teamId, email: emailOverride } = body;

    if (!applicationId) {
      return errorResponse("Missing application ID");
    }

    const service = await createServiceClient();
    const appUrl = getRequestAppUrl(request);
    const redirectTo = `${appUrl}/auth/callback?next=/set-password`;

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

    const authResult = await ensureAuthUser(
      service,
      volunteerEmail,
      application.full_name,
      redirectTo
    );

    if ("error" in authResult && authResult.error) {
      return errorResponse(authResult.error);
    }

    const { userId, passwordSetupUrl } = authResult;
    const authWarning = "warning" in authResult ? authResult.warning : undefined;

    const { data: existingProfile } = await service
      .from("profiles")
      .select("id")
      .eq("email", volunteerEmail)
      .maybeSingle();

    if (existingProfile) {
      const { error: profileUpdateError } = await service
        .from("profiles")
        .update({
          role: role ?? "volunteer",
          team_id: teamId ?? null,
          full_name: application.full_name,
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
        role: role ?? "volunteer",
        team_id: teamId ?? null,
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
        reviewed_by: reviewer,
        reviewed_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    if (approvalError) {
      return errorResponse(`Could not mark application approved: ${approvalError.message}`);
    }

    let emailWarning: string | undefined = authWarning;
    if (passwordSetupUrl) {
      try {
        await sendVolunteerApprovalEmail(
          volunteerEmail,
          application.full_name,
          passwordSetupUrl
        );
      } catch (emailError) {
        emailWarning =
          emailError instanceof Error
            ? `Volunteer approved, but the welcome email failed: ${emailError.message}`
            : "Volunteer approved, but the welcome email could not be sent.";
      }
    } else if (!authWarning) {
      emailWarning =
        "Volunteer approved. Ask them to visit the login page and use Forgot Password to set their password.";
    }

    return NextResponse.json({
      success: true,
      warning: emailWarning,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "An unexpected error occurred while approving the volunteer.";
    return errorResponse(message, 500);
  }
}
