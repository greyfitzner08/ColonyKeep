import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { canViewTrapTeamSection } from "@/lib/permissions";
import { fetchTrapTeamDashboardData } from "@/lib/dashboard/trap-team-data";

export async function GET(request: NextRequest) {
  const { profile, response } = await requireApiRole([
    "admin",
    "volunteer",
    "inquiry_team",
    "trap_team_lead",
    "clinic_coordination",
  ]);
  if (response) return response;

  if (!canViewTrapTeamSection(profile)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const teamId = request.nextUrl.searchParams.get("team");
  if (!teamId) {
    return NextResponse.json({ error: "Missing team id" }, { status: 400 });
  }

  if (profile!.role !== "admin" && profile!.team_id !== teamId) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const supabase = await createClient();
  const service = await createServiceClient();
  const data = await fetchTrapTeamDashboardData(service, supabase, teamId);

  if (!data) {
    return NextResponse.json({ error: "Team not found" }, { status: 404 });
  }

  return NextResponse.json({ data });
}
