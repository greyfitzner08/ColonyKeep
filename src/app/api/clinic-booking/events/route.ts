import { NextResponse } from "next/server";
import { availableSpots } from "@/lib/clinic-events/availability";
import { createServiceClient } from "@/lib/supabase/server";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";
import type { PublicBooking, PublicClinicEvent } from "@/lib/types";
import { normalizeServiceCatalog } from "@/lib/clinics/service-catalog";

function normalizeEvents(
  rows: Array<Record<string, unknown>>
): PublicClinicEvent[] {
  return rows.map((row) => {
    const clinics = row.clinics as { check_in_details?: string | null } | null;
    const { clinics: _clinics, ...event } = row;
    const typed = event as unknown as PublicClinicEvent;
    return {
      ...typed,
      check_in_details: clinics?.check_in_details ?? null,
      service_catalog: normalizeServiceCatalog(
        typed.service_catalog,
        typed.included_services,
        typed.addon_services
      ),
    };
  });
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json(
      { error: "Clinic booking is not configured on this server." },
      { status: 503 }
    );
  }

  const service = await createServiceClient();

  // Visibility is controlled by is_active — admins deactivate events when booking should close.
  let eventsQuery = service
    .from("public_clinic_events")
    .select("*, clinics(check_in_details)")
    .eq("is_active", true)
    .order("date");

  if (eventId) {
    eventsQuery = eventsQuery.eq("id", eventId);
  }

  const { data: events, error } = await eventsQuery;
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  const counts: Record<string, number> = {};
  const available: Record<string, number> = {};

  for (const event of events ?? []) {
    const { data: bookings, error: countError } = await service
      .from("public_bookings")
      .select("*")
      .eq("event_id", event.id);

    if (countError) {
      return NextResponse.json({ error: countError.message }, { status: 400 });
    }

    const bookingRows = (bookings ?? []) as PublicBooking[];
    counts[event.id] = bookingRows.length;
    available[event.id] = availableSpots(event.total_spots, bookingRows);
  }

  return NextResponse.json({
    events: normalizeEvents((events ?? []) as Array<Record<string, unknown>>),
    counts,
    available,
  });
}
