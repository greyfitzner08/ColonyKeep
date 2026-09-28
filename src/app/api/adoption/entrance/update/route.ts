import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { sanitizeEntranceAnswers, submissionDateStamp } from "@/lib/adoption/entrance";
import { canAccessAdoptions } from "@/lib/permissions";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin", "volunteer", "trap_team_lead"]);
  if (response) return response;
  if (!canAccessAdoptions(profile)) {
    return NextResponse.json({ error: "Adoption access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const id = "id" in body && typeof body.id === "string" ? body.id : "";
  if (!id) {
    return NextResponse.json({ error: "Application id is required." }, { status: 400 });
  }

  const parsed = sanitizeEntranceAnswers("answers" in body ? body.answers : null, {
    includeStaff: true,
  });
  if (parsed.error) {
    return NextResponse.json({ error: parsed.error }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: existing, error: loadError } = await service
    .from("adoption_entrance_applications")
    .select("id, created_at")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }

  parsed.answers.date_referred = submissionDateStamp(existing.created_at);

  const { error } = await service
    .from("adoption_entrance_applications")
    .update({
      cat_name: parsed.answers.cat_name,
      answers: parsed.answers,
    })
    .eq("id", id);

  if (error) {
    return NextResponse.json({ error: "Unable to save these answers." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, answers: parsed.answers });
}
