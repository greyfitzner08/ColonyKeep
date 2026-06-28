import type { FemaleReproductiveStatus } from "@/lib/cases/female-reproductive-status";
import type { Cat } from "@/lib/types";

const FEMALE_REPRODUCTIVE_STATUSES = new Set<FemaleReproductiveStatus>([
  "not_pregnant",
  "pregnant",
  "in_heat",
  "lactating",
  "post_partum",
]);

export function parseFemaleReproductiveStatus(
  value: unknown
): FemaleReproductiveStatus | "" {
  if (typeof value !== "string" || !value.trim()) return "";
  return FEMALE_REPRODUCTIVE_STATUSES.has(value as FemaleReproductiveStatus)
    ? (value as FemaleReproductiveStatus)
    : "";
}

export type TrackedCatDetails = {
  name: string;
  gender: "" | "male" | "female";
  femaleReproductiveStatus: FemaleReproductiveStatus | "";
  colors: string;
  microchip_id: string;
  medical_notes: string;
};

export const EMPTY_TRACKED_CAT_DETAILS: TrackedCatDetails = {
  name: "",
  gender: "",
  femaleReproductiveStatus: "",
  colors: "",
  microchip_id: "",
  medical_notes: "",
};

export function trackedCatDetailsFromCat(cat: Cat): TrackedCatDetails {
  const gender = cat.gender?.trim().toLowerCase();
  const normalizedGender =
    gender === "male" || gender === "female"
      ? gender
      : gender?.startsWith("f")
        ? "female"
        : gender?.startsWith("m")
          ? "male"
          : "";

  return {
    name: cat.name ?? "",
    gender: normalizedGender,
    femaleReproductiveStatus: cat.female_reproductive_status ?? "",
    colors: cat.colors ?? "",
    microchip_id: cat.microchip_id ?? "",
    medical_notes: cat.medical_notes ?? "",
  };
}

export function trackedCatDetailsPayload(details: TrackedCatDetails) {
  return {
    name: details.name.trim() || null,
    gender: details.gender || null,
    colors: details.colors.trim() || null,
    microchip_id: details.microchip_id.trim() || null,
    medical_notes: details.medical_notes.trim() || null,
  };
}
