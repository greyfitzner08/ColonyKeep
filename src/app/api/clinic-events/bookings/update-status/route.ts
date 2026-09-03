import { NextRequest, NextResponse } from "next/server";
import { requireClinicManager } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { PublicBooking, PublicBookingStatus } from "@/lib/types";

const ALLOWED: PublicBookingStatus[] = ["confirmed", "cancelled", "waitlist"];

export async function POST(request: NextRequest) {
  const { response } = await requireClinicManager();
  if (response) return response;

  const body = await request.json();
  const bookingId = body.booking_id as string | undefined;
  const status = body.status as PublicBookingStatus | undefined;

  if (!bookingId || !status || !ALLOWED.includes(status)) {
    return NextResponse.json({ error: "Invalid booking_id or status" }, { status: 400 });
  }

  const service = await createServiceClient();

  const { data: booking, error: bookingError } = await service
    .from("public_bookings")
    .select("*")
    .eq("id", bookingId)
    .single();

  if (bookingError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const row = booking as PublicBooking;
  if (row.contact_email === "hold@pending.local") {
    return NextResponse.json({ error: "Cannot update placeholder hold" }, { status: 400 });
  }

  const { data: updated, error: updateError } = await service
    .from("public_bookings")
    .update({
      status,
      expires_at: null,
      hold_session_id: null,
    })
    .eq("id", bookingId)
    .select()
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  return NextResponse.json({ booking: updated });
}
