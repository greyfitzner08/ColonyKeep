import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { UserRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const { userId, role, teamId } = body as {
    userId?: string;
    role?: UserRole;
    teamId?: string | null;
  };

  if (!userId || !role) {
    return NextResponse.json({ error: "Missing userId or role" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ role, team_id: teamId ?? null })
    .eq("id", userId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}
