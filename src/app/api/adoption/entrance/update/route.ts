import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { ADOPTABLE_CAT_STATUSES, type AdoptableCatSex, type AdoptableCatStatus } from "@/lib/adoption/constants";
import { formatVaccinationList, sanitizeEntranceAnswers, submissionDateStamp, type EntranceAnswers } from "@/lib/adoption/entrance";
import { canAccessAdoptions } from "@/lib/permissions";
import { createServiceClient } from "@/lib/supabase/server";

function sexFromGender(gender: string | undefined): AdoptableCatSex | null {
  if (gender === "female" || gender === "male" || gender === "unknown") return gender;
  return null;
}

function rosterStatus(answers: EntranceAnswers, current: AdoptableCatStatus): AdoptableCatStatus {
  if (answers.adopted === "yes") return "adopted";
  const raw = answers.current_status?.trim().toLowerCase() ?? "";
  const match = ADOPTABLE_CAT_STATUSES.find(
    (entry) => entry.value === raw || entry.label.toLowerCase() === raw
  );
  return match?.value ?? current;
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
    .select("id, created_at, adoptable_cat_id")
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

  if (existing.adoptable_cat_id) {
    const { data: cat } = await service
      .from("adoptable_cats")
      .select("status")
      .eq("id", existing.adoptable_cat_id)
      .maybeSingle();
    if (cat) {
      const sex = sexFromGender(parsed.answers.gender);
      const patch: {
        name: string;
        age_description: string | null;
        sex: AdoptableCatSex | null;
        personality_notes: string | null;
        notes: string | null;
        vaccination_notes: string | null;
        medical_notes: string | null;
        status: AdoptableCatStatus;
        spayed_neutered?: boolean;
      } = {
        name: parsed.answers.cat_name,
        age_description: parsed.answers.estimated_age || null,
        sex,
        personality_notes: parsed.answers.personality || null,
        notes: parsed.answers.notes || null,
        vaccination_notes: formatVaccinationList(parsed.answers.vaccinations) || null,
        medical_notes: parsed.answers.tests_treatments || null,
        status: rosterStatus(parsed.answers, cat.status as AdoptableCatStatus),
      };
      if (parsed.answers.date_spayed_neutered) patch.spayed_neutered = true;
      await service.from("adoptable_cats").update(patch).eq("id", existing.adoptable_cat_id);
    }
  }

  return NextResponse.json({ ok: true, answers: parsed.answers });
}
