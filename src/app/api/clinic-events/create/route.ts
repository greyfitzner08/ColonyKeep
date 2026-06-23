import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin", "clinic_coordination"]);
  if (response) return response;

  const body = await request.json();
  const service = await createServiceClient();
  const { data, error } = await service
    .from("public_clinic_events")
    .insert({
      clinic_id: body.clinic_id,
      clinic_name: body.clinic_name,
      title: body.title,
      date: body.date,
      location: body.location,
      total_spots: body.total_spots ?? 0,
      description: body.description ?? null,
      base_price: body.base_price ?? 0,
      cost_description: body.cost_description ?? null,
      payment_url: body.payment_url ?? null,
      included_services: body.included_services ?? [],
      addon_services: body.addon_services ?? [],
      is_active: body.is_active ?? true,
      pending_email_message: body.pending_email_message ?? null,
      confirmed_email_message: body.confirmed_email_message ?? null,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ event: data });
}
