import { NextResponse } from "next/server";
import { availableSpots } from "@/lib/clinic-events/availability";
import { createServiceClient } from "@/lib/supabase/server";
import type { PublicBooking } from "@/lib/types";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const eventId = searchParams.get("eventId");

  const service = await createServiceClient();
  const today = new Date().toISOString().split("T")[0];

  let eventsQuery = service
    .from("public_clinic_events")
    .select("*")
    .eq("is_active", true)
    .gte("date", today)
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

  return NextResponse.json({ events: events ?? [], counts, available });
}
