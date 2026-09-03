import { NextRequest, NextResponse } from "next/server";
import { countOccupiedSpots } from "@/lib/clinic-events/availability";
import {
  CLINIC_HOLD_EXTENSION_MINUTES,
  CLINIC_HOLD_MAX_EXTENSIONS,
  clinicHoldExtensionMs,
  holdExtensionNotes,
  parseHoldExtensions,
} from "@/lib/clinic-events/hold-duration";
import { createServiceClient } from "@/lib/supabase/server";
import type { PublicBooking } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const sessionId = body.session_id as string | undefined;

  if (!sessionId) {
    return NextResponse.json({ error: "Missing session_id" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: holds, error: holdsError } = await service
    .from("public_bookings")
    .select("*")
    .eq("hold_session_id", sessionId)
    .eq("status", "pending")
    .eq("contact_email", "hold@pending.local");

  if (holdsError) {
    return NextResponse.json({ error: holdsError.message }, { status: 400 });
  }

  const holdRows = (holds ?? []) as PublicBooking[];
  if (holdRows.length === 0) {
    return NextResponse.json({ error: "Hold session expired or not found" }, { status: 410 });
  }

  const used = parseHoldExtensions(holdRows[0].notes);
  if (used >= CLINIC_HOLD_MAX_EXTENSIONS) {
    await service
      .from("public_bookings")
      .update({ status: "expired" })
      .eq("hold_session_id", sessionId)
      .eq("status", "pending");
    return NextResponse.json(
      { error: "No more timer extensions are available. Please start again." },
      { status: 403 }
    );
  }

  const eventId = holdRows[0].event_id;
  const { data: event } = await service
    .from("public_clinic_events")
    .select("id, total_spots, is_active")
    .eq("id", eventId)
    .single();

  if (!event?.is_active) {
    return NextResponse.json({ error: "Clinic event is not available" }, { status: 400 });
  }

  const { data: bookings } = await service.from("public_bookings").select("*").eq("event_id", eventId);
  const others = ((bookings ?? []) as PublicBooking[]).filter(
    (booking) => booking.hold_session_id !== sessionId
  );
  const remainingForSession = Math.max(0, event.total_spots - countOccupiedSpots(others));
  if (holdRows.length > remainingForSession) {
    await service
      .from("public_bookings")
      .update({ status: "expired" })
      .eq("hold_session_id", sessionId)
      .eq("status", "pending");
    return NextResponse.json(
      { error: "Those spots were taken. Please start again." },
      { status: 409 }
    );
  }

  const nextUsed = used + 1;
  const expiresAt = new Date(Date.now() + clinicHoldExtensionMs()).toISOString();
  const { error: updateError } = await service
    .from("public_bookings")
    .update({
      expires_at: expiresAt,
      notes: holdExtensionNotes(nextUsed),
    })
    .eq("hold_session_id", sessionId)
    .eq("status", "pending");

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({
    expires_at: expiresAt,
    extensions_used: nextUsed,
    extensions_remaining: CLINIC_HOLD_MAX_EXTENSIONS - nextUsed,
    extension_minutes: CLINIC_HOLD_EXTENSION_MINUTES,
  });
}
