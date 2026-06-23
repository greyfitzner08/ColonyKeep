import { NextRequest, NextResponse } from "next/server";
import { syncProfileTeamMembership } from "@/lib/admin/team-members";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { isTeamEligibleVolunteer } from "@/lib/volunteers/eligibility";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const { userId, teamId } = body as {
    userId?: string;
    teamId?: string | null;
  };

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("id, email, team_id, role")
    .eq("id", userId)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (!profile.role) {
    return NextResponse.json({ error: "User does not have an active volunteer role" }, { status: 400 });
  }

  const nextTeamId = teamId ?? null;

  if (nextTeamId) {
    const { data: team, error: teamError } = await service
      .from("trap_teams")
      .select("id")
      .eq("id", nextTeamId)
      .single();

    if (teamError || !team) {
      return NextResponse.json({ error: "Team not found" }, { status: 404 });
    }

    const { data: application } = await service
      .from("volunteer_applications")
      .select("*")
      .eq("email", profile.email)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!application || !isTeamEligibleVolunteer(application)) {
      return NextResponse.json(
        {
          error:
            "Volunteer must be approved with TNVR certificate, field training, and signed policy/waiver before team assignment",
        },
        { status: 400 }
      );
    }
  }

  try {
    await syncProfileTeamMembership(service, profile, nextTeamId);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unable to update team assignment" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true });
}
