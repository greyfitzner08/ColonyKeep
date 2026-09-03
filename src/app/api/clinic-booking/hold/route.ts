import { NextRequest, NextResponse } from "next/server";
import { availableSpots } from "@/lib/clinic-events/availability";
import { clinicHoldDurationMs } from "@/lib/clinic-events/hold-duration";
import { createServiceClient } from "@/lib/supabase/server";
import type { PublicBooking } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const eventId = body.event_id as string | undefined;
  const spotCount = Math.min(Math.max(Number.parseInt(String(body.spot_count ?? "1"), 10) || 1, 1), 20);

  if (!eventId) {
    return NextResponse.json({ error: "Missing event_id" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: event, error: eventError } = await service
    .from("public_clinic_events")
    .select("id, total_spots, is_active")
    .eq("id", eventId)
    .single();

  if (eventError || !event?.is_active) {
    return NextResponse.json({ error: "Clinic event is not available" }, { status: 400 });
  }

  const { data: bookings, error: bookingsError } = await service
    .from("public_bookings")
    .select("*")
    .eq("event_id", eventId);

  if (bookingsError) {
    return NextResponse.json({ error: bookingsError.message }, { status: 400 });
  }

  const remaining = availableSpots(event.total_spots, (bookings ?? []) as PublicBooking[]);
  if (spotCount > remaining) {
    return NextResponse.json(
      { error: `Only ${remaining} spot${remaining === 1 ? "" : "s"} available` },
      { status: 409 }
    );
  }

  const sessionId = crypto.randomUUID();
  const expiresAt = new Date(Date.now() + clinicHoldDurationMs(spotCount));

  const rows = Array.from({ length: spotCount }, () => ({
    event_id: eventId,
    status: "pending" as const,
    hold_session_id: sessionId,
    expires_at: expiresAt.toISOString(),
    contact_name: "Hold",
    contact_email: "hold@pending.local",
    contact_phone: "000",
    cat_name: "Pending",
    total_price: 0,
  }));

  const { error: insertError } = await service.from("public_bookings").insert(rows);
  if (insertError) {
    return NextResponse.json({ error: insertError.message }, { status: 400 });
  }

  return NextResponse.json({
    session_id: sessionId,
    spot_count: spotCount,
    expires_at: expiresAt.toISOString(),
  });
}
