import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { ADOPTABLE_CAT_STATUSES, type AdoptableCatSex, type AdoptableCatStatus } from "@/lib/adoption/constants";
import { formatVaccinationList, submissionDateStamp, type EntranceAnswers } from "@/lib/adoption/entrance";
import { parseCatImportCsv } from "@/lib/adoption/import-cats";
import { canAccessAdoptions } from "@/lib/permissions";
import { createServiceClient } from "@/lib/supabase/server";

function sexFromGender(gender: string | undefined): AdoptableCatSex | null {
  if (gender === "female" || gender === "male" || gender === "unknown") return gender;
  return null;
}

function rosterStatus(answers: EntranceAnswers): AdoptableCatStatus {
  if (answers.adopted === "yes") return "adopted";
  const raw = answers.current_status?.trim().toLowerCase() ?? "";
  const match = ADOPTABLE_CAT_STATUSES.find(
    (entry) => entry.value === raw || entry.label.toLowerCase() === raw
  );
  return match?.value ?? "available";
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin", "volunteer", "trap_team_lead"]);
  if (response) return response;
  if (!canAccessAdoptions(profile)) {
    return NextResponse.json({ error: "Adoption access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const csvText = body && typeof body.csvText === "string" ? body.csvText : "";
  if (!csvText.trim()) {
    return NextResponse.json({ error: "Choose a CSV file to import." }, { status: 400 });
  }

  const parsed = parseCatImportCsv(csvText);
  if (parsed.fileError) {
    return NextResponse.json({ error: parsed.fileError }, { status: 400 });
  }
  if (parsed.cats.length === 0) {
    return NextResponse.json(
      { imported: 0, names: [], errors: parsed.errors },
      { status: 400 }
    );
  }

  const service = await createServiceClient();
  const names: string[] = [];
  const errors = [...parsed.errors];
  const reviewedAt = new Date().toISOString();

  for (const cat of parsed.cats) {
    const answers: EntranceAnswers = {
      ...cat.answers,
      date_referred: submissionDateStamp(),
    };
    const vaccinationLines = formatVaccinationList(answers.vaccinations);
    const { data: created, error: catError } = await service
      .from("adoptable_cats")
      .insert({
        name: answers.cat_name,
        age_description: answers.estimated_age || null,
        sex: sexFromGender(answers.gender),
        status: rosterStatus(answers),
        personality_notes: answers.personality || null,
        notes: answers.notes || null,
        medical_notes: answers.tests_treatments || null,
        vaccination_notes: vaccinationLines || null,
        vaccinated: vaccinationLines ? true : null,
        spayed_neutered: answers.date_spayed_neutered ? true : null,
        created_by_email: profile?.email ?? null,
      })
      .select("id, name")
      .single();

    if (catError || !created) {
      errors.push({ row: cat.row, error: catError?.message ?? `Unable to add ${answers.cat_name}.` });
      continue;
    }

    const { error: recordError } = await service.from("adoption_entrance_applications").insert({
      status: "approved",
      cat_name: answers.cat_name,
      answers,
      reviewed_by: profile?.email ?? null,
      reviewed_at: reviewedAt,
      adoptable_cat_id: created.id,
    });

    if (recordError) {
      await service.from("adoptable_cats").delete().eq("id", created.id);
      errors.push({ row: cat.row, error: `Unable to add ${answers.cat_name}.` });
      continue;
    }

    names.push(created.name);
  }

  return NextResponse.json({
    imported: names.length,
    names,
    errors,
  });
}
