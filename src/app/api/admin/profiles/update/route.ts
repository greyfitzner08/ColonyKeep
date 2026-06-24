import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { UserRole, VolunteerRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const { userId, role, teamId, volunteer_roles, fullName } = body as {
    userId?: string;
    role?: UserRole;
    teamId?: string | null;
    volunteer_roles?: VolunteerRole[];
    fullName?: string;
  };

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const updates: {
    role?: UserRole;
    team_id?: string | null;
    volunteer_roles?: VolunteerRole[];
    full_name?: string;
  } = {};

  if (role !== undefined) updates.role = role;
  if (teamId !== undefined) updates.team_id = teamId;
  if (volunteer_roles !== undefined) updates.volunteer_roles = volunteer_roles;

  if (fullName !== undefined) {
    const trimmed = fullName.trim();
    if (!trimmed) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    updates.full_name = trimmed;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No profile fields to update" }, { status: 400 });
  }

  const service = await createServiceClient();

  const { data: existingProfile, error: loadError } = await service
    .from("profiles")
    .select("email")
    .eq("id", userId)
    .single();

  if (loadError || !existingProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const { error } = await service.from("profiles").update(updates).eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (updates.full_name) {
    await service
      .from("volunteer_applications")
      .update({ full_name: updates.full_name })
      .eq("email", existingProfile.email);
  }

  return NextResponse.json({ success: true });
}
