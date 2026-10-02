export type AdoptableCatStatus =
  | "available"
  | "pending"
  | "adopted"
  | "hold"
  | "unavailable";

export type AdoptableCatSex = "male" | "female" | "unknown";

export type DiseaseTestStatus = "unknown" | "negative" | "positive";

export type FipStatus = DiseaseTestStatus | "suspected";

export interface AdoptableCat {
  id: string;
  name: string;
  age_description: string | null;
  sex: AdoptableCatSex | null;
  status: AdoptableCatStatus;
  profile_photo_url: string | null;
  spayed_neutered: boolean | null;
  vaccinated: boolean | null;
  vaccination_notes: string | null;
  fiv_status: DiseaseTestStatus;
  felv_status: DiseaseTestStatus;
  fip_status: FipStatus;
  medical_notes: string | null;
  personality_notes: string | null;
  notes: string | null;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
}

export const ADOPTABLE_CAT_STATUSES: { value: AdoptableCatStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "pending", label: "Pending adoption" },
  { value: "hold", label: "On hold" },
  { value: "adopted", label: "Adopted" },
  { value: "unavailable", label: "Not adoptable" },
];

export const ADOPTABLE_CAT_SEXES: { value: AdoptableCatSex; label: string }[] = [
  { value: "male", label: "Male" },
  { value: "female", label: "Female" },
  { value: "unknown", label: "Unknown" },
];

export const DISEASE_TEST_STATUSES: { value: DiseaseTestStatus; label: string }[] = [
  { value: "unknown", label: "Unknown" },
  { value: "negative", label: "Negative" },
  { value: "positive", label: "Positive" },
];

export const FIP_STATUSES: { value: FipStatus; label: string }[] = [
  { value: "unknown", label: "Unknown" },
  { value: "negative", label: "Negative" },
  { value: "positive", label: "Positive" },
  { value: "suspected", label: "Suspected" },
];

export function adoptableCatStatusLabel(status: AdoptableCatStatus): string {
  return ADOPTABLE_CAT_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}
