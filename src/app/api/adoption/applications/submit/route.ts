import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import {
  emptyAdoptionAnswers,
  emptyAdoptionPet,
  type AdoptionApplicationAnswers,
  type AdoptionApplicationPet,
  type CatLivingPlan,
  type EmploymentStatus,
  type HomeActivity,
  type PetCurrentStatus,
  type RehomeCircumstance,
  type ResidenceType,
  type YesNo,
  type YesNoNa,
  type YesNoUnsure,
} from "@/lib/adoption/application";

function asString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asYesNo(value: unknown): YesNo | "" {
  return value === "yes" || value === "no" ? value : "";
}

function asYesNoNa(value: unknown): YesNoNa | "" {
  return value === "yes" || value === "no" || value === "not_applicable" ? value : "";
}

function asYesNoUnsure(value: unknown): YesNoUnsure | "" {
  return value === "yes" || value === "no" || value === "unsure" ? value : "";
}

function asStringArray<T extends string>(value: unknown, allowed: Set<T>): T[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is T => typeof entry === "string" && allowed.has(entry as T));
}

function parsePet(value: unknown): AdoptionApplicationPet {
  if (!value || typeof value !== "object") return emptyAdoptionPet();
  const pet = value as Record<string, unknown>;
  const status = asString(pet.current_status) as PetCurrentStatus | "";
  const allowed = new Set(["in_home", "deceased", "rehomed", "lost", "other"]);
  return {
    name: asString(pet.name),
    age: asString(pet.age),
    year_acquired: asString(pet.year_acquired),
    animal_type: asString(pet.animal_type),
    gender: asString(pet.gender),
    current_status: allowed.has(status) ? status : "",
    current_status_other: asString(pet.current_status_other),
  };
}

function parseAnswers(raw: unknown): AdoptionApplicationAnswers {
  const base = emptyAdoptionAnswers();
  if (!raw || typeof raw !== "object") return base;
  const body = raw as Record<string, unknown>;

  const residenceTypes = new Set<ResidenceType>([
    "house",
    "apartment",
    "condominium",
    "townhome",
    "mobile_home",
    "other",
  ]);
  const employment = new Set<EmploymentStatus>([
    "employed_full_time",
    "employed_part_time",
    "self_employed",
    "student",
    "retired",
    "unemployed",
    "other",
  ]);
  const activities = new Set<HomeActivity>([
    "quiet_low",
    "moderately_active",
    "very_active",
    "frequent_visitors",
    "young_children",
    "teenagers",
    "other_pets",
    "other",
  ]);
  const living = new Set<CatLivingPlan>([
    "indoors_only",
    "indoors_supervised_outdoor",
    "indoors_and_outdoors",
    "outdoors_only",
  ]);
  const rehome = new Set<RehomeCircumstance>([
    "moving",
    "financial_hardship",
    "household_change",
    "allergies",
    "behavior_concerns",
    "health_concerns",
    "relationship_change",
    "loss_of_housing",
    "none_anticipated",
    "other",
  ]);

  const residence = asString(body.residence_type) as ResidenceType | "";
  const employmentStatus = asString(body.employment_status) as EmploymentStatus | "";
  const livingPlan = asString(body.living_plan) as CatLivingPlan | "";

  const petsRaw = Array.isArray(body.pets) ? body.pets : [];
  const pets = petsRaw.length > 0 ? petsRaw.map(parsePet) : [emptyAdoptionPet()];

  return {
    how_heard: asString(body.how_heard),
    lifelong_commitment: asYesNo(body.lifelong_commitment),
    housemate_name: asString(body.housemate_name),
    address_line_1: asString(body.address_line_1),
    address_line_2: asString(body.address_line_2),
    city: asString(body.city),
    state: asString(body.state),
    residence_type: residenceTypes.has(residence as ResidenceType) ? residence : "",
    residence_type_other: asString(body.residence_type_other),
    rents: asYesNo(body.rents),
    rent_cats_approved: asYesNoNa(body.rent_cats_approved),
    landlord_name: asString(body.landlord_name),
    landlord_email: asString(body.landlord_email),
    landlord_phone: asString(body.landlord_phone),
    employment_status: employment.has(employmentStatus as EmploymentStatus)
      ? employmentStatus
      : "",
    employment_status_other: asString(body.employment_status_other),
    employer: asString(body.employer),
    age_range: asString(body.age_range),
    adults_in_home: asString(body.adults_in_home),
    adults_work_outside: asYesNoNa(body.adults_work_outside),
    children_in_home: asString(body.children_in_home),
    activity_levels: asStringArray(body.activity_levels, activities),
    activity_other: asString(body.activity_other),
    allergic_to_cats: asYesNoUnsure(body.allergic_to_cats),
    allergic_explanation: asString(body.allergic_explanation),
    living_plan: living.has(livingPlan as CatLivingPlan) ? livingPlan : "",
    plan_to_declaw: asYesNo(body.plan_to_declaw),
    hours_alone: asString(body.hours_alone),
    backup_caregiver: asString(body.backup_caregiver),
    rehome_circumstances: asStringArray(body.rehome_circumstances, rehome),
    rehome_other: asString(body.rehome_other),
    can_pay_vet_costs: asYesNoUnsure(body.can_pay_vet_costs),
    cat_is_family: asYesNo(body.cat_is_family),
    had_pets_last_five_years: asYesNo(body.had_pets_last_five_years),
    vet_practice_name: asString(body.vet_practice_name),
    vet_phone: asString(body.vet_phone),
    vet_name: asString(body.vet_name),
    never_had_pet_vet_plan: asString(body.never_had_pet_vet_plan),
    has_pet_2: asYesNo(body.has_pet_2),
    has_pet_3: asYesNo(body.has_pet_3),
    pets,
    reference_1_name: asString(body.reference_1_name),
    reference_1_relationship: asString(body.reference_1_relationship),
    reference_1_email: asString(body.reference_1_email),
    reference_1_phone: asString(body.reference_1_phone),
    reference_2_name: asString(body.reference_2_name),
    reference_2_relationship: asString(body.reference_2_relationship),
    reference_2_email: asString(body.reference_2_email),
    reference_2_phone: asString(body.reference_2_phone),
    final_comments: asString(body.final_comments),
  };
}

export async function POST(request: NextRequest) {
  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const catInterestName = asString(body.cat_interest_name);
  const firstName = asString(body.applicant_first_name);
  const lastName = asString(body.applicant_last_name);
  const email = asString(body.applicant_email).toLowerCase();
  const phone = asString(body.applicant_phone);

  if (!catInterestName) {
    return NextResponse.json({ error: "Cat name is required" }, { status: 400 });
  }
  if (!firstName || !lastName) {
    return NextResponse.json({ error: "First and last name are required" }, { status: 400 });
  }
  if (!email || !email.includes("@")) {
    return NextResponse.json({ error: "A valid email is required" }, { status: 400 });
  }
  if (!phone) {
    return NextResponse.json({ error: "Phone number is required" }, { status: 400 });
  }

  const answers = parseAnswers(body.answers);
  if (!answers.lifelong_commitment) {
    return NextResponse.json(
      { error: "Please confirm you understand adopting is a lifelong commitment" },
      { status: 400 }
    );
  }
  if (!answers.address_line_1 || !answers.city || !answers.state) {
    return NextResponse.json({ error: "Address, city, and state are required" }, { status: 400 });
  }
  if (!answers.residence_type || !answers.rents) {
    return NextResponse.json({ error: "Residence details are required" }, { status: 400 });
  }
  if (!answers.employment_status || !answers.age_range) {
    return NextResponse.json({ error: "Household employment and age range are required" }, { status: 400 });
  }
  if (!answers.living_plan || !answers.plan_to_declaw || !answers.can_pay_vet_costs) {
    return NextResponse.json({ error: "Cat care questions are required" }, { status: 400 });
  }
  if (!answers.reference_1_name || !answers.reference_1_phone) {
    return NextResponse.json({ error: "At least one personal reference is required" }, { status: 400 });
  }

  const service = await createServiceClient();
  let catId: string | null =
    typeof body.cat_id === "string" && body.cat_id.trim() ? body.cat_id.trim() : null;

  if (catId) {
    const { data: cat } = await service
      .from("adoptable_cats")
      .select("id")
      .eq("id", catId)
      .maybeSingle();
    if (!cat) catId = null;
  }

  const { data, error } = await service
    .from("adoption_applications")
    .insert({
      cat_id: catId,
      cat_interest_name: catInterestName,
      applicant_first_name: firstName,
      applicant_last_name: lastName,
      applicant_email: email,
      applicant_phone: phone,
      answers,
      status: "pending",
    })
    .select("id")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ id: data.id, ok: true });
}
