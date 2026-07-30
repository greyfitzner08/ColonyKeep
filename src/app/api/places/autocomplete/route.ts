import { NextRequest, NextResponse } from "next/server";
import { getGoogleMapsApiKey } from "@/lib/google-maps";

export async function GET(request: NextRequest) {
  const input = request.nextUrl.searchParams.get("input")?.trim() ?? "";
  if (!input) {
    return NextResponse.json({ predictions: [] });
  }

  const apiKey = getGoogleMapsApiKey();
  if (!apiKey) {
    return NextResponse.json({
      predictions: [],
      error:
        "Address suggestions are not configured. Set a real GOOGLE_MAPS_API_KEY in .env.local (and Vercel) with Places API enabled.",
    });
  }

  // No `types=address` filter — event/clinic locations are often venues/businesses.
  const url = new URL("https://maps.googleapis.com/maps/api/place/autocomplete/json");
  url.searchParams.set("input", input);
  url.searchParams.set("components", "country:us");
  url.searchParams.set("key", apiKey);

  const res = await fetch(url.toString());
  const data = await res.json().catch(() => null);

  if (!data || data.status === "REQUEST_DENIED" || data.status === "INVALID_REQUEST") {
    return NextResponse.json({
      predictions: [],
      error:
        data?.error_message ??
        `Google Places autocomplete failed (${data?.status ?? "unknown"}). Check the API key and enable Places API.`,
    });
  }

  if (data.status === "ZERO_RESULTS") {
    return NextResponse.json({ predictions: [] });
  }

  return NextResponse.json({
    predictions: (data.predictions ?? []).map(
      (p: { description: string; place_id: string }) => ({
        description: p.description,
        place_id: p.place_id,
      })
    ),
  });
}
