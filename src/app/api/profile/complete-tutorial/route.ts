import { NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST() {
  const { profile, response } = await requireApiRole([
    "admin",
    "volunteer",
    "inquiry_team",
    "trap_team_lead",
    "clinic_coordination",
  ]);
  if (response) return response;

  const service = await createServiceClient();
  const completedAt = new Date().toISOString();

  const { error } = await service
    .from("profiles")
    .update({ platform_tutorial_completed_at: completedAt })
    .eq("id", profile!.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true, platform_tutorial_completed_at: completedAt });
}
