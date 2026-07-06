import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { previewVolunteerAssignments } from "@/lib/admin/volunteer-assignments";
import { createServiceClient } from "@/lib/supabase/server";
import type { Profile } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const userId = typeof body.userId === "string" ? body.userId.trim() : "";

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  if (userId === profile!.id) {
    return NextResponse.json({ error: "You cannot remove your own account." }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: targetProfile, error } = await service
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .maybeSingle();

  if (error || !targetProfile) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  const preview = await previewVolunteerAssignments(service, targetProfile as Profile);
  return NextResponse.json({ preview });
}
