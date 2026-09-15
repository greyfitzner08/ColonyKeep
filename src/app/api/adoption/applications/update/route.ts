import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { canAccessAdoptions } from "@/lib/permissions";
import {
  ADOPTION_APPLICATION_STATUSES,
  type AdoptionApplicationStatus,
} from "@/lib/adoption/application";

const STATUSES = new Set(ADOPTION_APPLICATION_STATUSES.map((entry) => entry.value));

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole([
    "admin",
    "volunteer",
    "inquiry_team",
    "trap_team_lead",
  ]);
  if (response) return response;
  if (!canAccessAdoptions(profile)) {
    return NextResponse.json({ error: "Adoption access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const id = typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "Application id is required" }, { status: 400 });
  }

  const updates: Record<string, unknown> = {};

  if (body.status != null) {
    const status = body.status as AdoptionApplicationStatus;
    if (!STATUSES.has(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }
    updates.status = status;
    updates.reviewed_by = profile!.email;
    updates.reviewed_at = new Date().toISOString();
  }

  if (typeof body.staff_notes === "string") {
    updates.staff_notes = body.staff_notes.trim() || null;
  }
  if (typeof body.additional_notes === "string") {
    updates.additional_notes = body.additional_notes.trim() || null;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data, error } = await service
    .from("adoption_applications")
    .update(updates)
    .eq("id", id)
    .select("*, cat:adoptable_cats(id, name, profile_photo_url)")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ application: data });
}
