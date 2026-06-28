import { NextRequest, NextResponse } from "next/server";
import { requireClinicManager } from "@/lib/api/auth";
import {
  sendPublicBookingCancelledEmail,
  sendPublicBookingConfirmedEmail,
  sendPublicBookingWaitlistEmail,
} from "@/lib/email";
import { createServiceClient } from "@/lib/supabase/server";
import type { PublicBooking, PublicBookingStatus, PublicClinicEvent } from "@/lib/types";

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

  const { data: event, error: eventError } = await service
    .from("public_clinic_events")
    .select("*")
    .eq("id", row.event_id)
    .single();

  if (eventError || !event) {
    return NextResponse.json({ error: "Event not found" }, { status: 404 });
  }

  const eventRow = event as PublicClinicEvent;

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

  const emailPayload = {
    title: eventRow.title,
    clinic_name: eventRow.clinic_name,
    date: eventRow.date,
    location: eventRow.location,
    payment_url: eventRow.payment_url,
    confirmed_email_message: eventRow.confirmed_email_message,
  };

  let emailWarning: string | undefined;

  try {
    if (status === "confirmed") {
      const emailResult = await sendPublicBookingConfirmedEmail(
        row.contact_email,
        row.contact_name,
        emailPayload,
        { cat_name: row.cat_name, total_price: row.total_price }
      );
      if (!emailResult.sent) {
        emailWarning = emailResult.error ?? "Confirmation email could not be sent";
      }
    } else if (status === "waitlist") {
      await sendPublicBookingWaitlistEmail(row.contact_email, row.contact_name, emailPayload, {
        cat_name: row.cat_name,
      });
    } else if (status === "cancelled") {
      await sendPublicBookingCancelledEmail(row.contact_email, row.contact_name, emailPayload, {
        cat_name: row.cat_name,
      });
    }
  } catch (emailError) {
    console.error("[email] Failed to send booking status email:", emailError);
    emailWarning =
      emailError instanceof Error ? emailError.message : "Status email could not be sent";
  }

  return NextResponse.json({ booking: updated, email_warning: emailWarning });
}
