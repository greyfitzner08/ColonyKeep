import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { isEventPastDate } from "@/lib/clinic-events/visibility";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const service = await createServiceClient();
  const { data: event, error: eventError } = await service
    .from("public_clinic_events")
    .select("id, total_spots, is_active, date")
    .eq("id", body.event_id)
    .single();

  if (eventError || !event?.is_active) {
    return NextResponse.json(
      { error: eventError?.message ?? "Clinic event is not available" },
      { status: 400 }
    );
  }

  if (isEventPastDate(event.date)) {
    return NextResponse.json(
      { error: "Cannot book a clinic event on a past date" },
      { status: 400 }
    );
  }

  const { count, error: countError } = await service
    .from("public_bookings")
    .select("*", { count: "exact", head: true })
    .eq("event_id", event.id)
    .in("status", ["pending", "confirmed"]);

  if (countError) {
    return NextResponse.json({ error: countError.message }, { status: 400 });
  }

  if ((count ?? 0) >= event.total_spots) {
    return NextResponse.json({ error: "This clinic event is full" }, { status: 409 });
  }

  const expiresAt = new Date();
  expiresAt.setHours(expiresAt.getHours() + 24);

  const { data, error } = await service
    .from("public_bookings")
    .insert({
      event_id: body.event_id,
      status: "pending",
      expires_at: expiresAt.toISOString(),
      contact_name: body.contact_name,
      contact_email: body.contact_email,
      contact_phone: body.contact_phone,
      cat_name: body.cat_name,
      cat_colors: body.cat_colors,
      cat_breed: body.cat_breed,
      cat_gender: body.cat_gender,
      has_injuries: body.has_injuries ?? false,
      injury_details: body.injury_details,
      selected_addons: body.selected_addons ?? [],
      notes: body.notes,
      total_price: body.total_price ?? 0,
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ booking: data });
}
