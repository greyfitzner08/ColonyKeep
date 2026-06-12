import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { sendWelcomeEmail } from "@/lib/email";

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

  const { data: application, error: appError } = await service
    .from("volunteer_applications")
    .update({
      status: "approved",
      reviewed_by: user.email,
      reviewed_at: new Date().toISOString(),
    })
    .eq("id", applicationId)
    .select()
    .single();

  if (appError || !application) {
    return NextResponse.json({ error: appError?.message ?? "Not found" }, { status: 400 });
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

  await sendWelcomeEmail(application.email, application.full_name);

  return NextResponse.json({ success: true });
}
