import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { geocodeStreetAddress } from "@/lib/geocode";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole([
    "admin",
    "inquiry_team",
    "trap_team_lead",
    "volunteer",
  ]);
  if (response) return response;

  const body = await request.json();
  const coords = await geocodeStreetAddress({
    street: body.street ?? body.feeder_street,
    city: body.city ?? body.feeder_city,
    state: body.state ?? body.feeder_state,
    zip: body.zip ?? body.feeder_zip,
    county: body.county ?? body.feeder_county,
  });

  return NextResponse.json({ coords });
}
