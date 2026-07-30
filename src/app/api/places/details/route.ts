import { NextRequest, NextResponse } from "next/server";
import { resolveCountyFromAutocomplete } from "@/lib/counties";
import { getGoogleMapsApiKey } from "@/lib/google-maps";

function getComponent(
  components: Array<{ long_name: string; short_name: string; types: string[] }>,
  type: string
): string {
  return components.find((c) => c.types.includes(type))?.long_name ?? "";
}

export async function GET(request: NextRequest) {
  const placeId = request.nextUrl.searchParams.get("place_id");
  if (!placeId) {
    return NextResponse.json({ error: "place_id required" }, { status: 400 });
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return NextResponse.json({ address: "", city: "", state: "", county: "", zip: "" });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "name,address_components,formatted_address,geometry");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  const data = await res.json();
  const result = data.result;

  if (!result) {
    return NextResponse.json({ address: "", city: "", state: "", county: "", zip: "" });
  }

  const components = result.address_components ?? [];
  const streetNumber = getComponent(components, "street_number");
  const route = getComponent(components, "route");
  const street = [streetNumber, route].filter(Boolean).join(" ");
  // Prefer street when available; otherwise keep the venue/formatted address for single-line fields.
  const address = street || result.name || result.formatted_address || "";
  const stateComponent = components.find((c: { types: string[] }) =>
    c.types.includes("administrative_area_level_1")
  );
  const state = stateComponent?.short_name || stateComponent?.long_name || "";
  const rawCounty = getComponent(components, "administrative_area_level_2");

  return NextResponse.json({
    address,
    city: getComponent(components, "locality") || getComponent(components, "sublocality"),
    state,
    county: resolveCountyFromAutocomplete(rawCounty, state),
    zip: getComponent(components, "postal_code"),
    lat: result.geometry?.location?.lat,
    lng: result.geometry?.location?.lng,
    formatted_address: result.formatted_address ?? "",
  });
}
