import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { canAccessAdoptions } from "@/lib/permissions";
import type {
  AdoptableCatSex,
  AdoptableCatStatus,
  DiseaseTestStatus,
  FipStatus,
} from "@/lib/adoption/constants";

const STATUSES = new Set<AdoptableCatStatus>([
  "available",
  "pending",
  "adopted",
  "hold",
  "unavailable",
]);
const SEXES = new Set<AdoptableCatSex>(["male", "female", "unknown"]);
const DISEASE = new Set<DiseaseTestStatus>(["unknown", "negative", "positive"]);
const FIP = new Set<FipStatus>(["unknown", "negative", "positive", "suspected"]);

function optionalBoolean(value: unknown): boolean | null {
  if (value === true || value === false) return value;
  return null;
}

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
    return NextResponse.json({ error: "Cat name is required" }, { status: 400 });
  }

  const status = (body.status as AdoptableCatStatus) || "available";
  if (!STATUSES.has(status)) {
    return NextResponse.json({ error: "Invalid status" }, { status: 400 });
  }

  const sex =
    body.sex === "" || body.sex == null ? null : (body.sex as AdoptableCatSex);
  if (sex != null && !SEXES.has(sex)) {
    return NextResponse.json({ error: "Invalid sex" }, { status: 400 });
  }

  const fiv = (body.fiv_status as DiseaseTestStatus) || "unknown";
  const felv = (body.felv_status as DiseaseTestStatus) || "unknown";
  const fip = (body.fip_status as FipStatus) || "unknown";
  if (!DISEASE.has(fiv) || !DISEASE.has(felv) || !FIP.has(fip)) {
    return NextResponse.json({ error: "Invalid disease test status" }, { status: 400 });
  }

  const payload = {
    name,
    age_description:
      typeof body.age_description === "string" ? body.age_description.trim() || null : null,
    sex,
    status,
    location_id:
      typeof body.location_id === "string" && body.location_id.trim()
        ? body.location_id.trim()
        : null,
    spayed_neutered: optionalBoolean(body.spayed_neutered),
    vaccinated: optionalBoolean(body.vaccinated),
    vaccination_notes:
      typeof body.vaccination_notes === "string" ? body.vaccination_notes.trim() || null : null,
    fiv_status: fiv,
    felv_status: felv,
    fip_status: fip,
    medical_notes:
      typeof body.medical_notes === "string" ? body.medical_notes.trim() || null : null,
    personality_notes:
      typeof body.personality_notes === "string" ? body.personality_notes.trim() || null : null,
    notes: typeof body.notes === "string" ? body.notes.trim() || null : null,
    created_by_email: profile!.email,
  };

  const service = await createServiceClient();
  const id = typeof body.id === "string" ? body.id : null;

  if (id) {
    const { created_by_email: _createdBy, ...updatePayload } = payload;
    const { data, error } = await service
      .from("adoptable_cats")
      .update(updatePayload)
      .eq("id", id)
      .select("*, location:adoption_locations(*)")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 400 });
    return NextResponse.json({ cat: data });
  }

  const { data, error } = await service
    .from("adoptable_cats")
    .insert(payload)
    .select("*, location:adoption_locations(*)")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ cat: data });
}
