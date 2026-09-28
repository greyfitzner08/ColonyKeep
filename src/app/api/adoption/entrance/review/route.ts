import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { canAccessAdoptions } from "@/lib/permissions";
import { createServiceClient } from "@/lib/supabase/server";
import type { AdoptableCatSex, AdoptableCatStatus } from "@/lib/adoption/constants";
import type { EntranceAnswers, EntranceReviewStatus } from "@/lib/adoption/entrance";

function text(value: string | undefined): string | null {
  const trimmed = value?.trim() ?? "";
  return trimmed || null;
}

function sexFromGender(gender: string | undefined): AdoptableCatSex | null {
  if (gender === "female" || gender === "male" || gender === "unknown") return gender;
  return null;
}

function rosterStatus(answers: EntranceAnswers): AdoptableCatStatus {
  if (answers.adopted === "yes") return "adopted";
  return "available";
}

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

  const id = typeof body.id === "string" ? body.id : "";
  const decision = body.decision as EntranceReviewStatus;
  const denialReason = typeof body.denial_reason === "string" ? body.denial_reason.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Application id is required." }, { status: 400 });
  }
  if (decision !== "approved" && decision !== "denied") {
    return NextResponse.json({ error: "Choose approve or decline." }, { status: 400 });
  }
  if (decision === "denied" && !denialReason) {
    return NextResponse.json(
      { error: "Enter why this cat was declined so the decision is clear." },
      { status: 400 }
    );
  }

  const service = await createServiceClient();
  const { data: existing, error: loadError } = await service
    .from("adoption_entrance_applications")
    .select("id, status, cat_name, answers, adoptable_cat_id")
    .eq("id", id)
    .maybeSingle();

  if (loadError || !existing) {
    return NextResponse.json({ error: "Application not found." }, { status: 404 });
  }
  if (existing.status !== "pending") {
    return NextResponse.json(
      { error: "This application has already been reviewed." },
      { status: 409 }
    );
  }

  const answers = (existing.answers ?? {}) as EntranceAnswers;
  let adoptableCatId = existing.adoptable_cat_id as string | null;
  let createdCatId: string | null = null;

  if (decision === "approved" && !adoptableCatId) {
    const medicalNotes = [
      text(answers.vaccinations) ? `Vaccinations: ${answers.vaccinations}` : null,
      text(answers.tests_treatments) ? `Tests / treatments: ${answers.tests_treatments}` : null,
      text(answers.next_vet_care_due) ? `Next care due: ${answers.next_vet_care_due}` : null,
      text(answers.prior_vet_record) ? `Prior record: ${answers.prior_vet_record}` : null,
    ]
      .filter(Boolean)
      .join("\n");
    const notes = [
      text(answers.description_breed),
      text(answers.notes),
      text(answers.where_found) ? `Found: ${answers.where_found}` : null,
      text(answers.bonded_with) ? `Bonded with: ${answers.bonded_with}` : null,
    ]
      .filter(Boolean)
      .join("\n\n");

    const { data: cat, error: catError } = await service
      .from("adoptable_cats")
      .insert({
        name: existing.cat_name,
        age_description: text(answers.estimated_age),
        sex: sexFromGender(answers.gender),
        status: rosterStatus(answers),
        personality_notes: text(answers.personality),
        notes: notes || null,
        medical_notes: medicalNotes || null,
        spayed_neutered: text(answers.date_spayed_neutered) ? true : null,
        vaccinated: text(answers.vaccinations) ? true : null,
        vaccination_notes: text(answers.vaccinations),
        created_by_email: profile?.email ?? null,
      })
      .select("id")
      .single();

    if (catError || !cat) {
      return NextResponse.json(
        { error: "The cat could not be added to the adoption roster." },
        { status: 500 }
      );
    }
    adoptableCatId = cat.id as string;
    createdCatId = adoptableCatId;
  }

  const { error: updateError } = await service
    .from("adoption_entrance_applications")
    .update({
      status: decision,
      denial_reason: decision === "denied" ? denialReason : null,
      reviewed_by: profile?.email ?? null,
      reviewed_at: new Date().toISOString(),
      adoptable_cat_id: adoptableCatId,
    })
    .eq("id", id)
    .eq("status", "pending");

  if (updateError) {
    if (createdCatId) {
      await service.from("adoptable_cats").delete().eq("id", createdCatId);
    }
    return NextResponse.json({ error: "Unable to save this decision." }, { status: 500 });
  }

  return NextResponse.json({ ok: true, adoptable_cat_id: adoptableCatId });
}
