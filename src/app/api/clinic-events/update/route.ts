import { NextRequest, NextResponse } from "next/server";
import { requireClinicManager } from "@/lib/api/auth";
import {
  normalizePricingMatrix,
  normalizePricingMode,
} from "@/lib/clinics/event-pricing";
import { catalogToLegacyFields } from "@/lib/clinics/service-catalog";
import { createServiceClient } from "@/lib/supabase/server";
import type { ClinicServiceOption } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { response } = await requireClinicManager();
  if (response) return response;

  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: "Missing event id" }, { status: 400 });
  }

  const catalog = (body.service_catalog ?? []) as ClinicServiceOption[];
  const legacy = catalogToLegacyFields(catalog);
  const pricingMode = normalizePricingMode(body.pricing_mode);
  const pricingMatrix =
    pricingMode === "matrix" ? normalizePricingMatrix(body.pricing_matrix) : [];
  const basePrice =
    pricingMode === "sponsored"
      ? 0
      : pricingMode === "matrix"
        ? Number(pricingMatrix[0]?.total_price ?? body.base_price) || 0
        : Number(body.base_price) || 0;
  const service = await createServiceClient();

  const { data, error } = await service
    .from("public_clinic_events")
    .update({
      clinic_id: body.clinic_id,
      clinic_name: body.clinic_name,
      title: body.title,
      date: body.date,
      location: body.location,
      total_spots: body.total_spots ?? 0,
      description: body.description ?? null,
      base_price: basePrice,
      pricing_mode: pricingMode,
      pricing_matrix: pricingMatrix,
      payment_url: body.payment_url ?? null,
      service_catalog: catalog,
      included_services: legacy.included_services,
      addon_services: legacy.addon_services,
      is_active: body.is_active ?? true,
      notes: body.notes ?? null,
      pending_email_message: body.pending_email_message ?? null,
      confirmed_email_message: body.confirmed_email_message ?? null,
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ event: data });
}
