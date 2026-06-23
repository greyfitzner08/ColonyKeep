import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendVolunteerApprovalEmail } from "@/lib/email";

const APP_URL = process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000";

function isAlreadyRegisteredError(message: string) {
  return /already registered|already exists|user already/i.test(message);
}

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = await request.json();
  const { applicationId, role, teamId } = body;

  const service = await createServiceClient();
  const redirectTo = `${APP_URL}/auth/callback?next=/set-password`;

  const { data: application, error: appError } = await service
    .from("volunteer_applications")
    .select()
    .eq("id", applicationId)
    .single();

  if (appError || !application) {
    return NextResponse.json({ error: appError?.message ?? "Not found" }, { status: 400 });
  }

  const inviteResult = await service.auth.admin.generateLink({
    type: "invite",
    email: application.email,
    options: {
      data: { full_name: application.full_name },
      redirectTo,
    },
  });

  const linkResult =
    inviteResult.error && isAlreadyRegisteredError(inviteResult.error.message)
      ? await service.auth.admin.generateLink({
          type: "recovery",
          email: application.email,
          options: { redirectTo },
        })
      : inviteResult;

  if (linkResult.error) {
    return NextResponse.json({ error: linkResult.error.message }, { status: 400 });
  }

  const authUser = linkResult.data.user;
  const passwordSetupUrl = linkResult.data.properties?.action_link;

  if (!authUser?.id || !passwordSetupUrl) {
    return NextResponse.json(
      { error: "Unable to create volunteer password setup link" },
      { status: 400 }
    );
  }

  const { data: existingProfile } = await service
    .from("profiles")
    .select("id")
    .eq("email", application.email)
    .single();

  if (existingProfile) {
    await service
      .from("profiles")
      .update({ role: role ?? "volunteer", team_id: teamId ?? null, full_name: application.full_name })
      .eq("id", existingProfile.id);
  } else {
    const { error: profileError } = await service
      .from("profiles")
      .insert({
        id: authUser.id,
        email: application.email,
        full_name: application.full_name,
        role: role ?? "volunteer",
        team_id: teamId ?? null,
      });

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 });
    }
  }

  if (teamId) {
    const { data: team } = await service.from("trap_teams").select("members").eq("id", teamId).single();
    if (team && !team.members.includes(application.email)) {
      await service
        .from("trap_teams")
        .update({ members: [...team.members, application.email] })
        .eq("id", teamId);
    }
  }

  const { error: approvalError } = await service
    .from("volunteer_applications")
    .update({
      status: "approved",
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId);

  if (approvalError) {
    return NextResponse.json({ error: approvalError.message }, { status: 400 });
  }

  await sendVolunteerApprovalEmail(
    application.email,
    application.full_name,
    passwordSetupUrl
  );

  return NextResponse.json({ success: true });
}
