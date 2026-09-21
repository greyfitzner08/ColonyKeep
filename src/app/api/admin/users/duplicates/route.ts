import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { rowsToDismissedPairKeySet } from "@/lib/admin/dismissed-duplicates";
import { findDuplicateProfileGroups } from "@/lib/admin/find-duplicate-profiles";
import { createServiceClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function GET() {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const service = await createServiceClient();
  const [{ data, error }, { data: dismissedRows, error: dismissedError }] = await Promise.all([
    service.from("profiles").select("*").order("full_name", { ascending: true }),
    service
      .from("dismissed_duplicate_pairs")
      .select("left_id, right_id")
      .eq("entity_type", "profile"),
  ]);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
  if (dismissedError) {
    return NextResponse.json({ error: dismissedError.message }, { status: 400 });
  }

  const groups = findDuplicateProfileGroups(
    (data ?? []) as Profile[],
    rowsToDismissedPairKeySet(dismissedRows)
  );

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
