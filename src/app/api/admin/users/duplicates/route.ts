import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { findDuplicateProfileGroups } from "@/lib/admin/find-duplicate-profiles";
import { createServiceClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function GET() {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const service = await createServiceClient();
  const { data, error } = await service
    .from("profiles")
    .select("*")
    .order("full_name", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const groups = findDuplicateProfileGroups((data ?? []) as Profile[]);

  return NextResponse.json({
    groups: groups.map((group) => ({
      id: group.id,
      reasons: group.reasons,
      profiles: group.profiles.map((profile) => ({
        id: profile.id,
        email: profile.email,
        full_name: profile.full_name,
        phone: profile.phone,
        birthday: profile.birthday,
        role: profile.role,
        volunteer_roles: profile.volunteer_roles,
        team_id: profile.team_id,
        created_at: profile.created_at,
      })),
    })),
  });
}

export async function POST(request: NextRequest) {
  // Allow POST body with optional profile list refresh — same as GET for now.
  void request;
  return GET();
}
