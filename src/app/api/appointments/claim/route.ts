import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { sendAppointmentConfirmationEmail } from "@/lib/email";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { appointmentId, helpRequestId, catId, catDetails } = body;

  const { data: profile } = await supabase
    .from("profiles")
    .select("full_name, role")
    .eq("id", user.id)
    .single();

  if (!profile?.role) {
    return NextResponse.json({ error: "Not approved" }, { status: 403 });
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .single();

  if (!appointment || appointment.status !== "available") {
    return NextResponse.json({ error: "Slot not available" }, { status: 400 });
  }

  const { data: helpRequest } = await supabase
    .from("help_requests")
    .select("contact_name, contact_email, contact_phone, case_number")
    .eq("id", helpRequestId)
    .single();

  const { error } = await supabase
    .from("appointments")
    .update({
      status: "reserved",
      help_request_id: helpRequestId,
      cat_id: catId ?? null,
      reserved_by: user.email,
      reserved_by_name: profile.full_name,
      contact_name: helpRequest?.contact_name,
      contact_email: helpRequest?.contact_email,
      contact_phone: helpRequest?.contact_phone,
      cat_name: catDetails?.name,
      cat_colors: catDetails?.colors,
      cat_breed: catDetails?.breed,
      cat_gender: catDetails?.gender,
      reserved_slots: 1,
    })
    .eq("id", appointmentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (helpRequestId) {
    await supabase
      .from("help_requests")
      .update({ status: "appointment_reserved" })
      .eq("id", helpRequestId);
  }

  const { data: clinic } = await supabase
    .from("clinics")
    .select("address")
    .eq("id", appointment.clinic_id)
    .single();
  const clinicAddress = clinic?.address ?? "";

  await sendAppointmentConfirmationEmail(
    user.email!,
    profile.full_name ?? user.email!,
    {
      clinic_name: appointment.clinic_name,
      clinic_address: clinicAddress,
      date: appointment.date,
      cat_name: catDetails?.name,
    }
  );

  return NextResponse.json({ success: true });
}
