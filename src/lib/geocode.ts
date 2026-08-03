import { canonicalServiceCounty, isKnownServiceCounty } from "@/lib/counties";
import { getGoogleMapsApiKey } from "@/lib/google-maps";

export interface GeocodeResult {
  lat: number;
  lng: number;
}

export interface GeocodeAddressParts {
  colony_address?: string | null;
  colony_city?: string | null;
  colony_state?: string | null;
  colony_zip?: string | null;
  colony_county?: string | null;
}

const PLACEHOLDER_VALUES = new Set([
  "unknown",
  "n/a",
  "na",
  "none",
  "null",
  "tbd",
  "not provided",
  "not available",
]);

function normalizeZip(value: string) {
  return value.replace(/\D/g, "").slice(0, 5);
}

export function isMeaningfulGeocodePart(value: string | null | undefined) {
  const trimmed = value?.trim();
  if (!trimmed) return false;

  const lower = trimmed.toLowerCase();
  if (PLACEHOLDER_VALUES.has(lower)) return false;

  const zipDigits = normalizeZip(trimmed);
  if (zipDigits.length === 5 && /^0+$/.test(zipDigits)) return false;

  return true;
}

function inferStateFromCounty(county?: string) {
  const canonical = county ? canonicalServiceCounty(county) : null;
  if (!canonical) return undefined;
  if (canonical === "Lancaster" || canonical === "York") return "SC";
  return "NC";
}

export function normalizeGeocodeParts(parts: GeocodeAddressParts) {
  const street = isMeaningfulGeocodePart(parts.colony_address)
    ? parts.colony_address!.trim()
    : undefined;
  const city = isMeaningfulGeocodePart(parts.colony_city) ? parts.colony_city!.trim() : undefined;
  const zip = isMeaningfulGeocodePart(parts.colony_zip)
    ? normalizeZip(parts.colony_zip!)
    : undefined;
  const county = isMeaningfulGeocodePart(parts.colony_county)
    ? canonicalServiceCounty(parts.colony_county!) ?? undefined
    : undefined;

  let state = isMeaningfulGeocodePart(parts.colony_state)
    ? parts.colony_state!.trim().toUpperCase()
    : undefined;

  if (!state && county) {
    state = inferStateFromCounty(county);
  }

  return { street, city, state, zip, county };
}

export function buildGeocodeQueries(parts: GeocodeAddressParts): string[] {
  const { street, city, state, zip, county } = normalizeGeocodeParts(parts);
  const queries: string[] = [];

  if (street && city && state && zip) queries.push(`${street}, ${city}, ${state} ${zip}`);
  if (street && zip && state) queries.push(`${street}, ${zip}, ${state}`);
  if (street && city && state) queries.push(`${street}, ${city}, ${state}`);
  if (street && county && state && zip) {
    queries.push(`${street}, ${county} County, ${state} ${zip}`);
  }
  if (street && county && state) queries.push(`${street}, ${county} County, ${state}`);
  if (street && zip) queries.push(`${street}, ${zip}`);
  if (street && state) queries.push(`${street}, ${state}`);
  if (street) queries.push(street);

  return [...new Set(queries.filter((query) => query.trim().length > 0))];
}

async function geocodeWithGoogle(query: string, apiKey: string): Promise<GeocodeResult | null> {
  const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
  url.searchParams.set("address", query);
  url.searchParams.set("key", apiKey);
  url.searchParams.set("region", "us");

  const res = await fetch(url.toString());
  const data = await res.json();
  if (data.status !== "OK") return null;

  const location = data.results?.[0]?.geometry?.location;
  if (location?.lat == null || location?.lng == null) return null;

  return { lat: location.lat, lng: location.lng };
}

async function geocodeWithNominatim(query: string): Promise<GeocodeResult | null> {
  const nominatimUrl = new URL("https://nominatim.openstreetmap.org/search");
  nominatimUrl.searchParams.set("q", query);
  nominatimUrl.searchParams.set("format", "json");
  nominatimUrl.searchParams.set("limit", "1");
  nominatimUrl.searchParams.set("countrycodes", "us");

  const res = await fetch(nominatimUrl.toString(), {
    headers: { "User-Agent": "TNVR-Rescue-Platform/1.0" },
  });
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (data.length === 0) return null;

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

async function geocodeWithNominatimStructured(
  parts: ReturnType<typeof normalizeGeocodeParts>
): Promise<GeocodeResult | null> {
  if (!parts.street) return null;

  const url = new URL("https://nominatim.openstreetmap.org/search");
  url.searchParams.set("street", parts.street);
  if (parts.city) url.searchParams.set("city", parts.city);
  if (parts.state) url.searchParams.set("state", parts.state);
  if (parts.zip) url.searchParams.set("postalcode", parts.zip);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("countrycodes", "us");

  const res = await fetch(url.toString(), {
    headers: { "User-Agent": "TNVR-Rescue-Platform/1.0" },
  });
  const data = (await res.json()) as Array<{ lat: string; lon: string }>;
  if (data.length === 0) return null;

  return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
}

export async function geocodeStreetAddress(parts: {
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
  county?: string | null;
}): Promise<GeocodeResult | null> {
  return geocodeAddress({
    colony_address: parts.street,
    colony_city: parts.city,
    colony_state: parts.state,
    colony_zip: parts.zip,
    colony_county: parts.county,
  });
}

export async function geocodeAddress(parts: GeocodeAddressParts): Promise<GeocodeResult | null> {
  const queries = buildGeocodeQueries(parts);
  if (queries.length === 0) return null;

  const googleKey = getGoogleMapsApiKey();
  if (googleKey) {
    for (const query of queries) {
      const coords = await geocodeWithGoogle(query, googleKey);
      if (coords) return coords;
    }
  }

  for (const query of queries) {
    const coords = await geocodeWithNominatim(query);
    if (coords) return coords;
    if (!googleKey) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }

  const structured = normalizeGeocodeParts(parts);
  if (structured.county && isKnownServiceCounty(structured.county)) {
    const coords = await geocodeWithNominatimStructured(structured);
    if (coords) return coords;
  }

  return null;
}
