export type FemaleReproductiveStatus =
  | "not_pregnant"
  | "pregnant"
  | "in_heat"
  | "lactating"
  | "post_partum";

export const FEMALE_REPRODUCTIVE_STATUS_OPTIONS: {
  value: FemaleReproductiveStatus;
  label: string;
}[] = [
  { value: "not_pregnant", label: "Not pregnant" },
  { value: "pregnant", label: "Pregnant" },
  { value: "in_heat", label: "In heat" },
  { value: "lactating", label: "Lactating" },
  { value: "post_partum", label: "Post-partum" },
];

export function isFemaleGender(gender: string | null | undefined): boolean {
  const value = gender?.trim().toLowerCase() ?? "";
  return value.startsWith("f") || value === "female";
}

export function femaleReproductiveStatusLabel(
  status: FemaleReproductiveStatus | string | null | undefined
): string | null {
  if (!status) return null;
  return (
    FEMALE_REPRODUCTIVE_STATUS_OPTIONS.find((option) => option.value === status)?.label ?? null
  );
}

export function parseFemaleReproductiveStatus(
  value: string | null | undefined
): FemaleReproductiveStatus | null {
  if (!value) return null;
  return FEMALE_REPRODUCTIVE_STATUS_OPTIONS.some((option) => option.value === value)
    ? (value as FemaleReproductiveStatus)
    : null;
}

export function resolveFemaleReproductiveStatusForSave(
  gender: string | null | undefined,
  status: FemaleReproductiveStatus | "" | null | undefined
): FemaleReproductiveStatus | null {
  if (!isFemaleGender(gender)) return null;
  if (!status) return null;
  return parseFemaleReproductiveStatus(status);
}
