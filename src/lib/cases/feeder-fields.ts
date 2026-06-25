import type { HelpRequest } from "@/lib/types";

export async function geocodeFeederIfNeeded(hr: HelpRequest): Promise<HelpRequest> {
  const hasFeederAddress =
    hr.feeder_street?.trim() || hr.feeder_city?.trim() || hr.feeder_zip?.trim();

  if (!hasFeederAddress) return hr;

  const geocodeResponse = await fetch("/api/geocode", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      street: hr.feeder_street,
      city: hr.feeder_city,
      state: hr.feeder_state,
      zip: hr.feeder_zip,
      county: hr.feeder_county,
    }),
  });
  const geocodeResult = await geocodeResponse.json().catch(() => null);
  if (!geocodeResult?.coords) return hr;

  return {
    ...hr,
    feeder_lat: geocodeResult.coords.lat,
    feeder_lng: geocodeResult.coords.lng,
  };
}

export const FEEDER_UPDATE_FIELDS = [
  "feeder_name",
  "feeder_phone",
  "feeder_email",
  "feeder_street",
  "feeder_city",
  "feeder_state",
  "feeder_zip",
  "feeder_county",
  "feeder_lat",
  "feeder_lng",
] as const;

export function feederPayload(hr: HelpRequest) {
  return {
    feeder_name: hr.feeder_name,
    feeder_phone: hr.feeder_phone,
    feeder_email: hr.feeder_email,
    feeder_street: hr.feeder_street,
    feeder_city: hr.feeder_city,
    feeder_state: hr.feeder_state,
    feeder_zip: hr.feeder_zip,
    feeder_county: hr.feeder_county,
    feeder_lat: hr.feeder_lat,
    feeder_lng: hr.feeder_lng,
  };
}
