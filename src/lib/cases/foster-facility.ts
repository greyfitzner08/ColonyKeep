export const FOSTER_FACILITIES = [
  { value: "humane_society_charlotte", label: "Humane Society of Charlotte" },
  { value: "animal_care_control", label: "Animal Care & Control" },
  { value: "pet_supermarket", label: "Pet Supermarket" },
  { value: "princetons_meow", label: "Princeton's Meow" },
  { value: "other", label: "Other" },
] as const;

export type FosterFacility = (typeof FOSTER_FACILITIES)[number]["value"];

export function fosterFacilityLabel(
  facility: FosterFacility | null | undefined,
  other: string | null | undefined
): string | null {
  if (!facility) return null;
  if (facility === "other") {
    const trimmed = other?.trim();
    return trimmed || "Other (unspecified)";
  }
  return FOSTER_FACILITIES.find((entry) => entry.value === facility)?.label ?? facility;
}

export function validateFosterFacilityInput(input: {
  wentToFosterFacility: boolean;
  fosterFacility?: string | null;
  fosterFacilityOther?: string | null;
}): string | null {
  if (!input.wentToFosterFacility) return null;

  const facility = input.fosterFacility?.trim();
  if (!facility) {
    return "Select where the cat went.";
  }

  const validValues = new Set(FOSTER_FACILITIES.map((entry) => entry.value));
  if (!validValues.has(facility as FosterFacility)) {
    return "Select a valid foster or facility.";
  }

  if (facility === "other" && !input.fosterFacilityOther?.trim()) {
    return "Enter where the cat went.";
  }

  return null;
}

export function normalizeFosterFacilityInput(input: {
  wentToFosterFacility: boolean;
  fosterFacility?: string | null;
  fosterFacilityOther?: string | null;
}) {
  if (!input.wentToFosterFacility) {
    return {
      went_to_foster_facility: false,
      foster_facility: null,
      foster_facility_other: null,
    };
  }

  const facility = input.fosterFacility as FosterFacility;
  return {
    went_to_foster_facility: true,
    foster_facility: facility,
    foster_facility_other:
      facility === "other" ? input.fosterFacilityOther?.trim() || null : null,
  };
}

export function formatFosterFacilitySummary(
  wentToFosterFacility: boolean,
  fosterFacility: FosterFacility | null | undefined,
  fosterFacilityOther: string | null | undefined
): string {
  if (!wentToFosterFacility) return "Returned to colony";
  const label = fosterFacilityLabel(fosterFacility, fosterFacilityOther);
  return label ? `Sent to ${label}` : "Sent to foster/facility";
}
