import { NextRequest, NextResponse } from "next/server";
import { requireAppointmentManager } from "@/lib/api/auth";
import { isClinicResultDue } from "@/lib/appointments/clinic-result";
import { recordClinicFix, type RecordClinicFixInput } from "@/lib/cases/record-clinic-fix";
import { fosterFacilityLabel } from "@/lib/cases/foster-facility";
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
  const {
    appointmentId,
    ageCategory,
    gender,
    wentToFosterFacility,
    fosterFacility,
    fosterFacilityOther,
  } = body as {
    appointmentId?: string;
    ageCategory?: "adult" | "kitten";
    gender?: "male" | "female";
    wentToFosterFacility?: boolean;
    fosterFacility?: string;
    fosterFacilityOther?: string;
  };

  if (!appointmentId) {
    return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
  }

  if (ageCategory !== "adult" && ageCategory !== "kitten") {
    return NextResponse.json({ error: "Select adult or kitten" }, { status: 400 });
  }

  if (gender !== "male" && gender !== "female") {
    return NextResponse.json({ error: "Select male or female" }, { status: 400 });
  }

  if (typeof wentToFosterFacility !== "boolean") {
    return NextResponse.json(
      { error: "Select whether the cat went to foster/facility or returned to colony." },
      { status: 400 }
    );
  }

  const { data: appointment } = await supabase
    .from("appointments")
    .select("*")
    .eq("id", appointmentId)
    .single();

  if (!appointment) {
    return NextResponse.json({ error: "Appointment not found" }, { status: 404 });
  }

  const isOwner = appointment.reserved_by === user.email;
  const isAdmin = profile!.role === "admin";
  if (!isOwner && !isAdmin) {
    return NextResponse.json(
      { error: "Only the person who reserved this appointment (or an admin) can log results" },
      { status: 403 }
    );
  }

  if (appointment.clinic_result_logged_at) {
    return NextResponse.json({ error: "Clinic results already logged for this appointment" }, { status: 400 });
  }

  if (!isClinicResultDue(appointment)) {
    return NextResponse.json(
      { error: "Clinic results can be logged starting the day after the appointment" },
      { status: 400 }
    );
  }

  if (!appointment.help_request_id) {
    return NextResponse.json({ error: "Appointment is not linked to a case" }, { status: 400 });
  }

  const loggedAt = new Date().toISOString();
  const actorName = profile!.full_name ?? user.email!;

  try {
    const { summary } = await recordClinicFix(service, {
      helpRequestId: appointment.help_request_id,
      appointmentId: appointment.id,
      catId: appointment.cat_id,
      ageCategory,
      gender,
      clinicName: appointment.clinic_name,
      fixDate: appointment.date,
      wentToFosterFacility,
      fosterFacility: (fosterFacility as RecordClinicFixInput["fosterFacility"]) ?? null,
      fosterFacilityOther: fosterFacilityOther?.trim() || null,
      actorEmail: user.email!,
      actorName,
    });

    const fosterLabel = wentToFosterFacility
      ? fosterFacilityLabel(
          fosterFacility as RecordClinicFixInput["fosterFacility"],
          fosterFacilityOther
        )
      : null;

    await service
      .from("appointments")
      .update({
        status: "completed",
        clinic_result_logged_at: loggedAt,
        clinic_result_age_category: ageCategory,
        clinic_result_gender: gender,
        clinic_result_logged_by: user.email,
        clinic_result_logged_by_name: actorName,
        cat_gender: gender,
      })
      .eq("id", appointmentId);

    if (appointment.cat_id) {
      await service
        .from("cats")
        .update({
          gender,
          trapped_status: "fixed",
          return_status: wentToFosterFacility ? "foster" : "returned",
          foster_program: fosterLabel,
          appointment_status: "completed",
        })
        .eq("id", appointment.cat_id);
    }

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to log clinic results";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
