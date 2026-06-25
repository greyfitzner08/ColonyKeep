export interface GeocodeResult {
  lat: number;
  lng: number;
}

function buildAddressQuery(parts: {
  colony_address?: string | null;
  colony_city?: string | null;
  colony_state?: string | null;
  colony_zip?: string | null;
  colony_county?: string | null;
}): string {
  return [
    parts.colony_address,
    parts.colony_city,
    parts.colony_state,
    parts.colony_zip,
    parts.colony_county,
  ]
    .filter(Boolean)
    .join(", ");
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

export async function geocodeAddress(parts: {
  colony_address?: string | null;
  colony_city?: string | null;
  colony_state?: string | null;
  colony_zip?: string | null;
  colony_county?: string | null;
}): Promise<GeocodeResult | null> {
  const query = buildAddressQuery(parts);
  if (!query.trim()) return null;

  const googleKey = process.env.GOOGLE_MAPS_API_KEY;
  if (googleKey) {
    const url = new URL("https://maps.googleapis.com/maps/api/geocode/json");
    url.searchParams.set("address", query);
    url.searchParams.set("key", googleKey);
    const res = await fetch(url.toString());
    const data = await res.json();
    const location = data.results?.[0]?.geometry?.location;
    if (location?.lat != null && location?.lng != null) {
      return { lat: location.lat, lng: location.lng };
    }
  }

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
