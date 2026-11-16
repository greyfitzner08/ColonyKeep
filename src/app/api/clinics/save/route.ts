import { revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";
import { requireClinicManager } from "@/lib/api/auth";
import { normalizeClinicEmails, normalizeClinicWebsite } from "@/lib/clinics/contact";
import { normalizeClinicHours, pruneClinicHours } from "@/lib/clinics/hours";
import { catalogToLegacyFields } from "@/lib/clinics/service-catalog";
import { geocodeFreeformAddress } from "@/lib/geocode";
import { createServiceClient } from "@/lib/supabase/server";
import type { ClinicServiceOption } from "@/lib/types";

function parseCoord(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

export async function POST(request: NextRequest) {
  const { response } = await requireClinicManager();
  if (response) return response;

  const body = await request.json();
  const catalog = (body.service_catalog ?? []) as ClinicServiceOption[];
  const legacy = catalogToLegacyFields(catalog);
  const address = typeof body.address === "string" ? body.address.trim() : "";

  let clinicLat = parseCoord(body.clinic_lat);
  let clinicLng = parseCoord(body.clinic_lng);

  if ((clinicLat == null || clinicLng == null) && address) {
    const coords = await geocodeFreeformAddress(address);
    if (coords) {
      clinicLat = coords.lat;
      clinicLng = coords.lng;
    }
  }

  const service = await createServiceClient();
  const payload = {
    name: body.name,
    address,
    phone: typeof body.phone === "string" ? body.phone.trim() : "",
    emails: normalizeClinicEmails(body.emails),
    website: normalizeClinicWebsite(body.website),
    operating_days: body.operating_days ?? [],
    hours_by_day: pruneClinicHours(
      Array.isArray(body.operating_days) ? body.operating_days : [],
      normalizeClinicHours(body.hours_by_day)
    ),
    slots_per_day: body.slots_per_day ?? 0,
    slots_by_day: body.slots_by_day ?? {},
    service_catalog: catalog,
    included_services: legacy.included_services,
    packages: body.packages ?? [],
    addon_services: legacy.addon_services,
    check_in_details: body.check_in_details ?? null,
    notes: body.notes ?? null,
    is_active: body.is_active ?? true,
    clinic_lat: clinicLat,
    clinic_lng: clinicLng,
  };

  const query = body.id
    ? service.from("clinics").update(payload).eq("id", body.id)
    : service.from("clinics").insert(payload);

  const { data, error } = await query.select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  revalidateTag("hotspots");
  return NextResponse.json({ clinic: data });
}
