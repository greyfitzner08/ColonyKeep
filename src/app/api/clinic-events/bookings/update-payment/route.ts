import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin", "clinic_coordination"]);
  if (response) return response;

  const body = await request.json();
  const bookingId = body.booking_id as string | undefined;
  const addonName = body.addon_name as string | undefined;
  const paid = body.paid as boolean | undefined;

  if (!bookingId || !addonName || typeof paid !== "boolean") {
    return NextResponse.json({ error: "Missing booking_id, addon_name, or paid" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: booking, error: fetchError } = await service
    .from("public_bookings")
    .select("addon_payments")
    .eq("id", bookingId)
    .single();

  if (fetchError || !booking) {
    return NextResponse.json({ error: "Booking not found" }, { status: 404 });
  }

  const payments = {
    ...((booking.addon_payments as Record<string, boolean> | null) ?? {}),
    [addonName]: paid,
  };

  const { data, error } = await service
    .from("public_bookings")
    .update({ addon_payments: payments })
    .eq("id", bookingId)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ booking: data });
}
