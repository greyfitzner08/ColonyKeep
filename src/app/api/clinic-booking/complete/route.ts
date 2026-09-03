import { NextRequest, NextResponse } from "next/server";
import { sendPublicBookingPendingEmail } from "@/lib/email";
import {
  buildInitialAddonPayments,
  calculateBookingTotal,
  normalizeServiceCatalog,
} from "@/lib/clinics/service-catalog";
import { createServiceClient } from "@/lib/supabase/server";
import type { PublicBooking, PublicClinicEvent } from "@/lib/types";

interface SpotPayload {
  contact_name: string;
  contact_email: string;
  contact_phone: string;
  cat_name?: string;
  cat_colors?: string;
  cat_gender?: string;
  has_injuries?: boolean;
  injury_details?: string;
  selected_addons?: string[];
  notes?: string;
  total_price?: number;
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const sessionId = body.session_id as string | undefined;
  const spots = (body.spots ?? []) as SpotPayload[];

  if (!sessionId || spots.length === 0) {
    return NextResponse.json({ error: "Missing session_id or spots" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data: holds, error: holdsError } = await service
    .from("public_bookings")
    .select("*")
    .eq("hold_session_id", sessionId)
    .eq("status", "pending");

  if (holdsError) {
    return NextResponse.json({ error: holdsError.message }, { status: 400 });
  }

  const holdRows = (holds ?? []) as PublicBooking[];
  if (holdRows.length === 0) {
    return NextResponse.json({ error: "Hold session expired or not found" }, { status: 410 });
  }

  const now = Date.now();
  if (holdRows.some((row) => row.expires_at && new Date(row.expires_at).getTime() <= now)) {
    await service
      .from("public_bookings")
      .update({ status: "expired" })
      .eq("hold_session_id", sessionId)
      .eq("status", "pending");
    return NextResponse.json({ error: "Your hold expired. Please start again." }, { status: 410 });
  }

  if (spots.length !== holdRows.length) {
    return NextResponse.json(
      { error: `Expected ${holdRows.length} spot form(s)` },
      { status: 400 }
    );
  }

  if (spots.some((spot) => !spot.cat_name?.trim())) {
    return NextResponse.json({ error: "Each cat needs a name." }, { status: 400 });
  }

  if (spots.some((spot) => !spot.cat_gender?.trim())) {
    return NextResponse.json(
      { error: "Select Male, Female, or Unknown for each cat." },
      { status: 400 }
    );
  }

  const confirmExpires = new Date();
  confirmExpires.setHours(confirmExpires.getHours() + 24);

  const { data: event } = await service
    .from("public_clinic_events")
    .select("*")
    .eq("id", holdRows[0].event_id)
    .single();

  const eventRow = event as PublicClinicEvent | null;
  const catalog = normalizeServiceCatalog(
    eventRow?.service_catalog,
    eventRow?.included_services,
    eventRow?.addon_services
  );

  for (let index = 0; index < holdRows.length; index += 1) {
    const hold = holdRows[index];
    const spot = spots[index];
    const selectedAddons = spot.selected_addons ?? [];
    const totalPrice = eventRow
      ? calculateBookingTotal(eventRow.base_price, catalog, selectedAddons)
      : spot.total_price ?? 0;

    const { error } = await service
      .from("public_bookings")
      .update({
        contact_name: spot.contact_name,
        contact_email: spot.contact_email,
        contact_phone: spot.contact_phone,
        cat_name: spot.cat_name ?? null,
        cat_colors: spot.cat_colors ?? null,
        cat_breed: null,
        cat_gender: spot.cat_gender ?? null,
        has_injuries: spot.has_injuries ?? false,
        injury_details: spot.injury_details ?? null,
        selected_addons: selectedAddons,
        addon_payments: buildInitialAddonPayments(selectedAddons),
        notes: spot.notes ?? null,
        total_price: totalPrice,
        expires_at: confirmExpires.toISOString(),
        hold_session_id: null,
        status: "pending",
      })
      .eq("id", hold.id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  const contact = spots[0];

  if (eventRow && contact) {
    const emailResult = await sendPublicBookingPendingEmail(
      contact.contact_email,
      contact.contact_name,
      {
        title: eventRow.title,
        clinic_name: eventRow.clinic_name,
        date: eventRow.date,
        location: eventRow.location,
        pending_email_message: eventRow.pending_email_message,
      },
      spots.map((spot) => ({
        cat_name: spot.cat_name,
        total_price: eventRow
          ? calculateBookingTotal(eventRow.base_price, catalog, spot.selected_addons ?? [])
          : spot.total_price ?? 0,
      }))
    );

    if (!emailResult.sent) {
      console.error("[email] Pending booking email failed:", emailResult.error);
    }
  }

  return NextResponse.json({ success: true, booking_count: holdRows.length });
}
