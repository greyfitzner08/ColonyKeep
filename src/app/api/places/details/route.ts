import { NextRequest, NextResponse } from "next/server";

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

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ address: "", city: "", county: "", zip: "" });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/details/json");
  url.searchParams.set("place_id", placeId);
  url.searchParams.set("fields", "address_components,formatted_address,geometry");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  const data = await res.json();
  const result = data.result;

  if (!result) {
    return NextResponse.json({ address: "", city: "", county: "", zip: "" });
  }

  const components = result.address_components ?? [];
  const streetNumber = getComponent(components, "street_number");
  const route = getComponent(components, "route");
  const address = [streetNumber, route].filter(Boolean).join(" ") || result.formatted_address;

  return NextResponse.json({
    address,
    city: getComponent(components, "locality") || getComponent(components, "sublocality"),
    state: getComponent(components, "administrative_area_level_1"),
    county: getComponent(components, "administrative_area_level_2"),
    zip: getComponent(components, "postal_code"),
    lat: result.geometry?.location?.lat,
    lng: result.geometry?.location?.lng,
  });
}
