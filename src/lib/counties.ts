/** Counties in the TNVR Rescue service area. */
export const SERVICE_COUNTIES = [
  "Mecklenburg",
  "Gaston",
  "Cabarrus",
  "Iredell",
  "Lincoln",
  "Union",
  "Lancaster",
  "York",
] as const;

export type ServiceCounty = (typeof SERVICE_COUNTIES)[number];

export const COUNTY_SELECT_OTHER = "__other__";

export function normalizeCountyName(value: string): string {
  return value.trim().replace(/\s+county$/i, "").trim();
}

export function isKnownServiceCounty(value: string): boolean {
  const normalized = normalizeCountyName(value);
  if (!normalized) return false;
  return SERVICE_COUNTIES.some((county) => county.toLowerCase() === normalized.toLowerCase());
}

export function canonicalServiceCounty(value: string): string | null {
  const normalized = normalizeCountyName(value);
  if (!normalized) return null;
  return (
    SERVICE_COUNTIES.find((county) => county.toLowerCase() === normalized.toLowerCase()) ?? null
  );
}

/** Drop bad Google Places county values (e.g. state name copied into county). */
export function resolveCountyFromAutocomplete(county: string, state?: string): string {
  const normalized = normalizeCountyName(county);
  if (!normalized) return "";

  const stateNorm = state?.trim();
  if (stateNorm) {
    if (normalized.toLowerCase() === stateNorm.toLowerCase()) return "";
    if (stateNorm.length === 2 && normalized.toLowerCase() === stateNorm.toLowerCase()) return "";
  }

  if (/^(north|south)\s+carolina$/i.test(normalized)) return "";
  if (/^[A-Z]{2}$/.test(normalized)) return "";

  return canonicalServiceCounty(normalized) ?? "";
}
