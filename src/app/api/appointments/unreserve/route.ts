import { NextRequest, NextResponse } from "next/server";
import { requireAppointmentManager } from "@/lib/api/auth";
import { createClient, createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { response } = await requireAppointmentManager();
  if (response) return response;

  const supabase = await createClient();
  const service = await createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { appointmentId } = (await request.json()) as { appointmentId?: string };
  if (!appointmentId) {
    return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select("id, status, help_request_id, cat_id")
    .eq("id", appointmentId)
    .single();

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  if (appointment.status === "available") {
    return NextResponse.json({ error: "Appointment is not reserved" }, { status: 400 });
  }

  if (!["reserved", "confirmed_transport"].includes(appointment.status)) {
    return NextResponse.json(
      { error: "Only reserved appointments can be released" },
      { status: 400 }
    );
  }

  const { error } = await service
    .from("appointments")
    .update({
      status: "available",
      help_request_id: null,
      cat_id: null,
      reserved_by: null,
      reserved_by_name: null,
      contact_name: null,
      contact_email: null,
      contact_phone: null,
      cat_name: null,
      cat_colors: null,
      cat_breed: null,
      cat_gender: null,
      reserved_slots: 0,
    })
    .eq("id", appointmentId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  if (appointment.cat_id) {
    await service
      .from("cats")
      .update({
        appointment_id: null,
        appointment_status: null,
      })
      .eq("id", appointment.cat_id);
  }

  if (appointment.help_request_id) {
    const { count } = await supabase
      .from("appointments")
      .select("*", { count: "exact", head: true })
      .eq("help_request_id", appointment.help_request_id)
      .neq("status", "available");

    if ((count ?? 0) === 0) {
      await service
        .from("help_requests")
        .update({ status: "routed_to_trap_team" })
        .eq("id", appointment.help_request_id)
        .eq("status", "appointment_reserved");
    }
  }

  return NextResponse.json({ success: true });
}
