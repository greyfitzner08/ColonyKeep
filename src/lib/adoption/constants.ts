export type AdoptionLocationType = "petstore" | "foster";

export type AdoptableCatStatus =
  | "available"
  | "pending"
  | "adopted"
  | "hold"
  | "unavailable";

export type AdoptableCatSex = "male" | "female" | "unknown";

export type DiseaseTestStatus = "unknown" | "negative" | "positive";

export type FipStatus = DiseaseTestStatus | "suspected";

export interface AdoptionLocation {
  id: string;
  name: string;
  location_type: AdoptionLocationType;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string | null;
  city: string | null;
  state: string | null;
  zip: string | null;
  notes: string | null;
  foster_profile_id: string | null;
  is_active: boolean;
  created_by_email: string | null;
  created_at: string;
  updated_at: string;
  cat_count?: number;
}

export interface AdoptableCat {
  id: string;
  name: string;
  age_description: string | null;
  sex: AdoptableCatSex | null;
  status: AdoptableCatStatus;
  location_id: string | null;
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
  location?: AdoptionLocation | null;
}

export const ADOPTION_LOCATION_TYPES: { value: AdoptionLocationType; label: string }[] = [
  { value: "petstore", label: "Pet store" },
  { value: "foster", label: "Foster home" },
];

export const ADOPTABLE_CAT_STATUSES: { value: AdoptableCatStatus; label: string }[] = [
  { value: "available", label: "Available" },
  { value: "pending", label: "Pending adoption" },
  { value: "hold", label: "On hold" },
  { value: "adopted", label: "Adopted" },
  { value: "unavailable", label: "Unavailable" },
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

export function adoptionLocationTypeLabel(type: AdoptionLocationType): string {
  return ADOPTION_LOCATION_TYPES.find((entry) => entry.value === type)?.label ?? type;
}

export function adoptableCatStatusLabel(status: AdoptableCatStatus): string {
  return ADOPTABLE_CAT_STATUSES.find((entry) => entry.value === status)?.label ?? status;
}

export function formatAdoptionLocationLine(location: Pick<
  AdoptionLocation,
  "name" | "location_type" | "city" | "address"
>): string {
  const type = adoptionLocationTypeLabel(location.location_type);
  const place = [location.address, location.city].filter(Boolean).join(", ");
  return place ? `${location.name} (${type}) · ${place}` : `${location.name} (${type})`;
}
