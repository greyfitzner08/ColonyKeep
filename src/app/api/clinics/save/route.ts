import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { catalogToLegacyFields } from "@/lib/clinics/service-catalog";
import { createServiceClient } from "@/lib/supabase/server";
import type { ClinicServiceOption } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin", "clinic_coordination"]);
  if (response) return response;

  const body = await request.json();
  const catalog = (body.service_catalog ?? []) as ClinicServiceOption[];
  const legacy = catalogToLegacyFields(catalog);

  const service = await createServiceClient();
  const payload = {
    name: body.name,
    address: body.address,
    phone: body.phone,
    operating_days: body.operating_days ?? [],
    slots_per_day: body.slots_per_day ?? 0,
    slots_by_day: body.slots_by_day ?? {},
    service_catalog: catalog,
    included_services: legacy.included_services,
    packages: body.packages ?? [],
    addon_services: legacy.addon_services,
    check_in_details: body.check_in_details ?? null,
    notes: body.notes ?? null,
    is_active: body.is_active ?? true,
  };

  const query = body.id
    ? service.from("clinics").update(payload).eq("id", body.id)
    : service.from("clinics").insert(payload);

  const { data, error } = await query.select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ clinic: data });
}
