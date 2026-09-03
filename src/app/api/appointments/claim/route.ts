import { NextRequest, NextResponse } from "next/server";
import { requireAppointmentManager } from "@/lib/api/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireAppointmentManager();
  if (response) return response;

  const supabase = await createClient();
  const service = await createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const { appointmentId, helpRequestId, catId, catDetails } = body;

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

  let resolvedCatId: string | null = catId ?? null;
  let catName = catDetails?.name ?? null;
  let catColors = catDetails?.colors ?? null;
  let catGender = catDetails?.gender ?? null;

  if (resolvedCatId) {
    const { data: existingCat } = await supabase
      .from("cats")
      .select("id, name, colors, gender")
      .eq("id", resolvedCatId)
      .eq("help_request_id", helpRequestId)
      .single();

    if (!existingCat) {
      return NextResponse.json({ error: "Cat not found on this case" }, { status: 400 });
    }

    catName = existingCat.name;
    catColors = existingCat.colors;
    catGender = existingCat.gender;

    await service
      .from("cats")
      .update({
        appointment_id: appointmentId,
        appointment_status: "reserved",
        clinic_id: appointment.clinic_id,
        clinic_name: appointment.clinic_name,
      })
      .eq("id", resolvedCatId);
  } else if (catDetails?.name?.trim() && helpRequestId) {
    const { data: newCat, error: catError } = await service
      .from("cats")
      .insert({
        help_request_id: helpRequestId,
        name: catDetails.name.trim(),
        gender: catDetails.gender ?? null,
        colors: catDetails.colors ?? null,
        clinic_id: appointment.clinic_id,
        clinic_name: appointment.clinic_name,
        appointment_id: appointmentId,
        appointment_status: "reserved",
      })
      .select("id, name, colors, gender")
      .single();

    if (catError) {
      return NextResponse.json({ error: catError.message }, { status: 400 });
    }

    resolvedCatId = newCat?.id ?? null;
    catName = newCat?.name ?? catDetails.name;
    catColors = newCat?.colors;
    catGender = newCat?.gender;
  }

  const { error } = await service
    .from("appointments")
    .update({
      status: "reserved",
      help_request_id: helpRequestId,
      cat_id: resolvedCatId,
      reserved_by: user.email,
      reserved_by_name: profile.full_name,
      contact_name: helpRequest?.contact_name,
      contact_email: helpRequest?.contact_email,
      contact_phone: helpRequest?.contact_phone,
      cat_name: catName,
      cat_colors: catColors,
      cat_breed: catDetails?.breed ?? null,
      cat_gender: catGender,
      reserved_slots: 1,
    })
    .eq("id", appointmentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (helpRequestId) {
    await service
      .from("help_requests")
      .update({ status: "appointment_reserved" })
      .eq("id", helpRequestId);
  }

  return NextResponse.json({ success: true, catId: resolvedCatId });
}
