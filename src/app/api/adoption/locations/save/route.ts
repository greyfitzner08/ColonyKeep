import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { canAccessAdoptions } from "@/lib/permissions";
import type { AdoptionLocationType } from "@/lib/adoption/constants";

const LOCATION_TYPES = new Set<AdoptionLocationType>(["petstore", "foster"]);

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole([
    "admin",
    "volunteer",
    "inquiry_team",
    "trap_team_lead",
  ]);
  if (response) return response;
  if (!canAccessAdoptions(profile)) {
    return NextResponse.json({ error: "Adoption access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const name = typeof body.name === "string" ? body.name.trim() : "";
  if (!name) {
    return NextResponse.json({ error: "Location name is required" }, { status: 400 });
  }

  const locationType = body.location_type as AdoptionLocationType;
  if (!LOCATION_TYPES.has(locationType)) {
    return NextResponse.json({ error: "Choose pet store or foster" }, { status: 400 });
  }

  const payload = {
    name,
    location_type: locationType,
    contact_name: typeof body.contact_name === "string" ? body.contact_name.trim() || null : null,
    contact_phone: typeof body.contact_phone === "string" ? body.contact_phone.trim() || null : null,
    contact_email: typeof body.contact_email === "string" ? body.contact_email.trim() || null : null,
    address: typeof body.address === "string" ? body.address.trim() || null : null,
    city: typeof body.city === "string" ? body.city.trim() || null : null,
    state: typeof body.state === "string" ? body.state.trim() || null : null,
    zip: typeof body.zip === "string" ? body.zip.trim() || null : null,
    notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    foster_profile_id:
      typeof body.foster_profile_id === "string" && body.foster_profile_id.trim()
        ? body.foster_profile_id.trim()
        : null,
    is_active: body.is_active !== false,
    created_by_email: profile!.email,
  };

  const service = await createServiceClient();
  const id = typeof body.id === "string" ? body.id : null;

  if (id) {
    const { data, error } = await service
      .from("adoption_locations")
      .update(payload)
      .eq("id", id)
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ location: data });
  }

  const { data, error } = await service
    .from("adoption_locations")
    .insert(payload)
    .select("*")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ location: data });
}
