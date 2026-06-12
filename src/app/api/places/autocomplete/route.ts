import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input");
  if (!input) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = process.env.GOOGLE_MAPS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ predictions: [] });
  }

  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("types", "address");
  url.searchParams.set("components", "country:us");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  const data = await res.json();

  return NextResponse.json({
    predictions: (data.predictions ?? []).map(
      (p: { description: string; place_id: string }) => ({
        description: p.description,
        place_id: p.place_id,
      })
    ),
  });
}
