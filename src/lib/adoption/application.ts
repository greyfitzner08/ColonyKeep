export type AdoptionApplicationStatus =
  | "pending"
  | "in_review"
  | "approved"
  | "denied"
  | "withdrawn";

export type ResidenceType =
  | "house"
  | "apartment"
  | "condominium"
  | "townhome"
  | "mobile_home"
  | "other";

export type EmploymentStatus =
  | "employed_full_time"
  | "employed_part_time"
  | "self_employed"
  | "student"
  | "retired"
  | "unemployed"
  | "other";

export type YesNo = "yes" | "no";
export type YesNoNa = "yes" | "no" | "not_applicable";
export type YesNoUnsure = "yes" | "no" | "unsure";

export type HomeActivity =
  | "quiet_low"
  | "moderately_active"
  | "very_active"
  | "frequent_visitors"
  | "young_children"
  | "teenagers"
  | "other_pets"
  | "other";

export type CatLivingPlan =
  | "indoors_only"
  | "indoors_supervised_outdoor"
  | "indoors_and_outdoors"
  | "outdoors_only";

export type RehomeCircumstance =
  | "moving"
  | "financial_hardship"
  | "household_change"
  | "allergies"
  | "behavior_concerns"
  | "health_concerns"
  | "relationship_change"
  | "loss_of_housing"
  | "none_anticipated"
  | "other";

export type PetCurrentStatus =
  | "in_home"
  | "deceased"
  | "rehomed"
  | "lost"
  | "other";

export type HowHeardSource =
  | "pet_store"
  | "petfinder"
  | "adopt_a_pet"
  | "friend_family"
  | "facebook"
  | "instagram"
  | "other";

export interface AdoptionApplicationPet {
  name: string;
  age: string;
  year_acquired: string;
  animal_type: string;
  animal_type_other: string;
  gender: string;
  current_status: PetCurrentStatus | "";
  current_status_other: string;
  spayed_neutered: YesNo | "";
}

export interface AdoptionApplicationAnswers {
  how_heard: HowHeardSource | "";
  how_heard_other: string;
  lifelong_commitment: YesNo | "";
  housemate_name: string;
  address_line_1: string;
  address_line_2: string;
  city: string;
  state: string;
  residence_type: ResidenceType | "";
  residence_type_other: string;
  rents: YesNo | "";
  rent_cats_approved: YesNoNa | "";
  landlord_name: string;
  landlord_email: string;
  landlord_phone: string;
  employment_status: EmploymentStatus | "";
  employment_status_other: string;
  employer: string;
  age_range: string;
  adults_in_home: string;
  adults_work_outside: YesNoNa | "";
  children_in_home: string;
  activity_levels: HomeActivity[];
  activity_other: string;
  allergic_to_cats: YesNoUnsure | "";
  allergic_explanation: string;
  living_plan: CatLivingPlan | "";
  plan_to_declaw: YesNo | "";
  hours_alone: string;
  backup_caregiver: string;
  rehome_circumstances: RehomeCircumstance[];
  rehome_other: string;
  can_pay_vet_costs: YesNoUnsure | "";
  cat_is_family: YesNo | "";
  had_pets_last_five_years: YesNo | "";
  vet_practice_name: string;
  vet_phone: string;
  vet_name: string;
  never_had_pet_vet_plan: string;
  has_pet_2: YesNo | "";
  has_pet_3: YesNo | "";
  pets: AdoptionApplicationPet[];
  reference_1_name: string;
  reference_1_relationship: string;
  reference_1_email: string;
  reference_1_phone: string;
  reference_2_name: string;
  reference_2_relationship: string;
  reference_2_email: string;
  reference_2_phone: string;
  final_comments: string;
}

export interface AdoptionApplication {
  id: string;
  status: AdoptionApplicationStatus;
  cat_id: string | null;
  cat_interest_name: string;
  applicant_first_name: string;
  applicant_last_name: string;
  applicant_email: string;
  applicant_phone: string;
  answers: AdoptionApplicationAnswers;
  staff_notes: string | null;
  additional_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  cat?: {
    id: string;
    name: string;
    profile_photo_url: string | null;
  } | null;
}

export const ADOPTION_APPLICATION_STATUSES: {
  value: AdoptionApplicationStatus;
  label: string;
}[] = [
  { value: "pending", label: "Pending" },
  { value: "in_review", label: "In review" },
  { value: "approved", label: "Approved" },
  { value: "denied", label: "Denied" },
  { value: "withdrawn", label: "Withdrawn" },
];

export const RESIDENCE_TYPES: { value: ResidenceType; label: string }[] = [
  { value: "house", label: "House" },
  { value: "apartment", label: "Apartment" },
  { value: "condominium", label: "Condominium" },
  { value: "townhome", label: "Townhome" },
  { value: "mobile_home", label: "Mobile home" },
  { value: "other", label: "Other" },
];

/** Common applicant age ranges for the adoption application. */
export const APPLICANT_AGE_RANGES = [
  "Under 18",
  "18–24",
  "25–34",
  "35–44",
  "45–54",
  "55–64",
  "65 or older",
  "Prefer not to say",
] as const;

export const HOW_HEARD_SOURCES: { value: HowHeardSource; label: string }[] = [
  { value: "pet_store", label: "Saw at Pet Store" },
  { value: "petfinder", label: "PetFinder" },
  { value: "adopt_a_pet", label: "Adopt-A-Pet" },
  { value: "friend_family", label: "Friend/Family" },
  { value: "facebook", label: "Facebook" },
  { value: "instagram", label: "Instagram" },
  { value: "other", label: "Other" },
];

export function isEmployedStatus(status: string): boolean {
  return (
    status === "employed_full_time" ||
    status === "employed_part_time" ||
    status === "self_employed"
  );
}

export const EMPLOYMENT_STATUSES: { value: EmploymentStatus; label: string }[] = [
  { value: "employed_full_time", label: "Employed full-time" },
  { value: "employed_part_time", label: "Employed part-time" },
  { value: "self_employed", label: "Self-employed" },
  { value: "student", label: "Student" },
  { value: "retired", label: "Retired" },
  { value: "unemployed", label: "Unemployed" },
  { value: "other", label: "Other" },
];

export const HOME_ACTIVITY_OPTIONS: { value: HomeActivity; label: string }[] = [
  { value: "quiet_low", label: "Quiet or low-activity" },
  { value: "moderately_active", label: "Moderately active" },
  { value: "very_active", label: "Very active or busy" },
  { value: "frequent_visitors", label: "Frequent visitors" },
  { value: "young_children", label: "Young children" },
  { value: "teenagers", label: "Teenagers" },
  { value: "other_pets", label: "Other pets" },
  { value: "other", label: "Other" },
];

export const CAT_LIVING_PLANS: { value: CatLivingPlan; label: string }[] = [
  { value: "indoors_only", label: "Indoors only" },
  { value: "indoors_supervised_outdoor", label: "Indoors with supervised outdoor time" },
  { value: "indoors_and_outdoors", label: "Indoors and outdoors" },
  { value: "outdoors_only", label: "Outdoors only" },
];

export const REHOME_CIRCUMSTANCES: { value: RehomeCircumstance; label: string }[] = [
  { value: "moving", label: "Moving" },
  { value: "financial_hardship", label: "Financial hardship" },
  { value: "household_change", label: "New baby or changes in household composition" },
  { value: "allergies", label: "Allergies" },
  { value: "behavior_concerns", label: "Behavior concerns" },
  { value: "health_concerns", label: "Health concerns" },
  { value: "relationship_change", label: "Separation, divorce, or relationship change" },
  { value: "loss_of_housing", label: "Loss of housing" },
  { value: "none_anticipated", label: "No circumstances anticipated" },
  { value: "other", label: "Other" },
];

export const PET_GENDERS: { value: string; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "spayed_female", label: "Spayed Female" },
  { value: "neutered_male", label: "Neutered Male" },
];

export const PET_TYPES: { value: string; label: string }[] = [
  { value: "cat", label: "Cat" },
  { value: "dog", label: "Dog" },
  { value: "other", label: "Other" },
];

export const PET_CURRENT_STATUSES: { value: PetCurrentStatus; label: string }[] = [
  { value: "in_home", label: "Currently living in the home" },
  { value: "deceased", label: "Deceased" },
  { value: "rehomed", label: "Rehomed" },
  { value: "lost", label: "Lost" },
  { value: "other", label: "Other" },
];

export function emptyAdoptionPet(): AdoptionApplicationPet {
  return {
    name: "",
    age: "",
    year_acquired: "",
    animal_type: "",
    animal_type_other: "",
    gender: "",
    current_status: "",
    current_status_other: "",
    spayed_neutered: "",
  };
}

export function isDogPetType(animalType: string | null | undefined): boolean {
  const value = animalType?.trim().toLowerCase() ?? "";
  return value === "dog" || value === "dogs";
}

export function petGenderLabel(gender: string | null | undefined): string {
  if (!gender) return "";
  return PET_GENDERS.find((entry) => entry.value === gender)?.label ?? gender;
}

export function petTypeLabel(pet: Pick<AdoptionApplicationPet, "animal_type" | "animal_type_other">): string {
  if (pet.animal_type === "other") return pet.animal_type_other?.trim() || "Other";
  return PET_TYPES.find((entry) => entry.value === pet.animal_type)?.label ?? pet.animal_type;
}

/** Pets the applicant chose to list (pet 1, plus 2 and 3 when those answers are yes). */
export function listedAdoptionPets(
  answers: Pick<AdoptionApplicationAnswers, "had_pets_last_five_years" | "has_pet_2" | "has_pet_3" | "pets">
): { index: number; pet: AdoptionApplicationPet }[] {
  if (answers.had_pets_last_five_years !== "yes") return [];
  let count = 1;
  if (answers.has_pet_2 === "yes") count = 2;
  if (answers.has_pet_2 === "yes" && answers.has_pet_3 === "yes") count = 3;
  return Array.from({ length: count }, (_, index) => ({
    index,
    pet: answers.pets[index] ?? emptyAdoptionPet(),
  }));
}

export interface AdoptionFieldError {
  field: string;
  message: string;
}

export function validateListedPets(answers: AdoptionApplicationAnswers): AdoptionFieldError[] {
  const errors: AdoptionFieldError[] = [];
  for (const { index, pet } of listedAdoptionPets(answers)) {
    if (!pet.name.trim()) {
      errors.push({ field: `pet-${index}-name`, message: "Pet name is required." });
    }
    if (!pet.age.trim()) {
      errors.push({ field: `pet-${index}-age`, message: "Age is required." });
    }
    if (!pet.year_acquired.trim()) {
      errors.push({ field: `pet-${index}-year`, message: "Year acquired is required." });
    }
    if (!pet.animal_type.trim()) {
      errors.push({ field: `pet-${index}-type`, message: "Pet type is required." });
    } else if (pet.animal_type === "other" && !pet.animal_type_other.trim()) {
      errors.push({ field: `pet-${index}-type-other`, message: "Describe the pet type." });
    }
    if (!PET_GENDERS.some((entry) => entry.value === pet.gender)) {
      errors.push({ field: `pet-${index}-gender`, message: "Gender is required." });
    }
    if (!pet.current_status) {
      errors.push({ field: `pet-${index}-status`, message: "Current status is required." });
    }
    if (pet.current_status === "in_home" && !pet.spayed_neutered) {
      errors.push({
        field: `pet-${index}-fixed`,
        message: "Say whether this pet currently in your home is spayed or neutered.",
      });
    }
  }
  return errors;
}

export function validatePetHistory(answers: AdoptionApplicationAnswers): AdoptionFieldError[] {
  if (answers.had_pets_last_five_years !== "yes") return [];
  const errors: AdoptionFieldError[] = [];
  if (!answers.vet_practice_name.trim() && !answers.vet_phone.trim()) {
    const message = "Enter the veterinary practice name or phone number.";
    errors.push({ field: "vet-practice", message });
    errors.push({ field: "vet-phone", message });
  }
  errors.push(...validateListedPets(answers));
  return errors;
}

export function validateAdoptionReferences(answers: AdoptionApplicationAnswers): AdoptionFieldError[] {
  const errors: AdoptionFieldError[] = [];
  if (!answers.reference_1_name.trim()) {
    errors.push({ field: "reference-1-name", message: "Full name is required." });
  }
  if (!answers.reference_1_phone.trim()) {
    errors.push({ field: "reference-1-phone", message: "Phone number is required." });
  }
  if (!answers.reference_2_name.trim()) {
    errors.push({ field: "reference-2-name", message: "Full name is required." });
  }
  if (!answers.reference_2_phone.trim()) {
    errors.push({ field: "reference-2-phone", message: "Phone number is required." });
  }
  return errors;
}

export function emptyAdoptionAnswers(): AdoptionApplicationAnswers {
  return {
    how_heard: "",
    how_heard_other: "",
    lifelong_commitment: "",
    housemate_name: "",
    address_line_1: "",
    address_line_2: "",
    city: "",
    state: "",
    residence_type: "",
    residence_type_other: "",
    rents: "",
    rent_cats_approved: "",
    landlord_name: "",
    landlord_email: "",
    landlord_phone: "",
    employment_status: "",
    employment_status_other: "",
    employer: "",
    age_range: "",
    adults_in_home: "",
    adults_work_outside: "",
    children_in_home: "",
    activity_levels: [],
    activity_other: "",
    allergic_to_cats: "",
    allergic_explanation: "",
    living_plan: "",
    plan_to_declaw: "",
    hours_alone: "",
    backup_caregiver: "",
    rehome_circumstances: [],
    rehome_other: "",
    can_pay_vet_costs: "",
    cat_is_family: "",
    had_pets_last_five_years: "",
    vet_practice_name: "",
    vet_phone: "",
    vet_name: "",
    never_had_pet_vet_plan: "",
    has_pet_2: "",
    has_pet_3: "",
    pets: [emptyAdoptionPet()],
    reference_1_name: "",
    reference_1_relationship: "",
    reference_1_email: "",
    reference_1_phone: "",
    reference_2_name: "",
    reference_2_relationship: "",
    reference_2_email: "",
    reference_2_phone: "",
    final_comments: "",
  };
}

export function adoptionApplicationStatusLabel(status: AdoptionApplicationStatus): string {
  return ADOPTION_APPLICATION_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}
