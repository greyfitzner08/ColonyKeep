import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { UserRole, VolunteerRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const { userId, role, teamId, volunteer_roles } = body as {
    userId?: string;
    role?: UserRole;
    teamId?: string | null;
    volunteer_roles?: VolunteerRole[];
  };

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const updates: {
    role?: UserRole;
    team_id?: string | null;
    volunteer_roles?: VolunteerRole[];
  } = {};

  if (role !== undefined) updates.role = role;
  if (teamId !== undefined) updates.team_id = teamId;
  if (volunteer_roles !== undefined) updates.volunteer_roles = volunteer_roles;

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No profile fields to update" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await service.from("profiles").update(updates).eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
