import { NextRequest, NextResponse } from "next/server";
import { requireAppointmentManager } from "@/lib/api/auth";
import { isClinicResultDue } from "@/lib/appointments/clinic-result";
import { recordClinicFix, type RecordClinicFixInput } from "@/lib/cases/record-clinic-fix";
import { saveTrackedCatFromClinicLog } from "@/lib/cases/save-tracked-cat-from-clinic-log";
import { parseFemaleReproductiveStatus, type TrackedCatDetails } from "@/lib/cases/tracked-cat-form";
import { isAutoSyncedClinicFix, updateHelpRequestCatCounts } from "@/lib/cases/tracked-cat-fix";
import { createClient, createServiceClient } from "@/lib/supabase/server";

function readCatDetails(body: Record<string, unknown>): TrackedCatDetails {
  return {
    name: String(body.name ?? ""),
    gender: body.gender === "male" || body.gender === "female" ? body.gender : "",
    femaleReproductiveStatus: parseFemaleReproductiveStatus(body.femaleReproductiveStatus),
    colors: String(body.colors ?? ""),
    microchip_id: String(body.microchip_id ?? ""),
    medical_notes: String(body.medical_notes ?? ""),
  };
}

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
  const details = readCatDetails(body);

  if (!appointmentId) {
    return NextResponse.json({ error: "Missing appointmentId" }, { status: 400 });
  }

  if (ageCategory !== "adult" && ageCategory !== "kitten") {
    return NextResponse.json({ error: "Select adult or kitten" }, { status: 400 });
  }

  const resolvedGender = details.gender || gender;
  if (resolvedGender !== "male" && resolvedGender !== "female") {
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

  const { data: existingFix } = await service
    .from("clinic_fixes")
    .select("id, logged_by, age_category, gender")
    .eq("appointment_id", appointmentId)
    .maybeSingle();

  if (existingFix && !isAutoSyncedClinicFix(existingFix)) {
    const loggedAt = new Date().toISOString();
    const actorName = profile!.full_name ?? user.email!;
    const catDetails: TrackedCatDetails = {
      ...details,
      gender: resolvedGender,
    };

    try {
      const savedCatId = await saveTrackedCatFromClinicLog(service, {
        helpRequestId: appointment.help_request_id,
        catId: appointment.cat_id,
        appointmentId: appointment.id,
        clinicName: appointment.clinic_name,
        details: catDetails,
        ageCategory,
        wentToFosterFacility,
        fosterFacility: (fosterFacility as RecordClinicFixInput["fosterFacility"]) ?? null,
        fosterFacilityOther: fosterFacilityOther?.trim() || null,
        skipFixSync: true,
      });

      await service
        .from("appointments")
        .update({
          status: "completed",
          clinic_result_logged_at: loggedAt,
          clinic_result_age_category: ageCategory,
          clinic_result_gender: resolvedGender,
          clinic_result_logged_by: user.email,
          clinic_result_logged_by_name: actorName,
          cat_id: savedCatId,
          cat_name: catDetails.name.trim() || appointment.cat_name,
          cat_colors: catDetails.colors.trim() || appointment.cat_colors,
          cat_gender: resolvedGender,
        })
        .eq("id", appointmentId);

      await updateHelpRequestCatCounts(service, appointment.help_request_id);

      return NextResponse.json({
        success: true,
        summary: "Clinic results were already recorded — appointment status updated.",
        repaired: true,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to finish logging clinic results";
      return NextResponse.json({ error: message }, { status: 400 });
    }
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
    const catDetails: TrackedCatDetails = {
      ...details,
      gender: resolvedGender,
    };

    const savedCatId = await saveTrackedCatFromClinicLog(service, {
      helpRequestId: appointment.help_request_id,
      catId: appointment.cat_id,
      appointmentId: appointment.id,
      clinicName: appointment.clinic_name,
      details: catDetails,
      ageCategory,
      wentToFosterFacility,
      fosterFacility: (fosterFacility as RecordClinicFixInput["fosterFacility"]) ?? null,
      fosterFacilityOther: fosterFacilityOther?.trim() || null,
      skipFixSync: true,
    });

    const { summary } = await recordClinicFix(service, {
      helpRequestId: appointment.help_request_id,
      appointmentId: appointment.id,
      catId: savedCatId,
      ageCategory,
      gender: resolvedGender,
      clinicName: appointment.clinic_name,
      fixDate: appointment.date,
      notes: catDetails.medical_notes.trim() || null,
      wentToFosterFacility,
      fosterFacility: (fosterFacility as RecordClinicFixInput["fosterFacility"]) ?? null,
      fosterFacilityOther: fosterFacilityOther?.trim() || null,
      actorEmail: user.email!,
      actorName,
    });

    await service
      .from("appointments")
      .update({
        status: "completed",
        clinic_result_logged_at: loggedAt,
        clinic_result_age_category: ageCategory,
        clinic_result_gender: resolvedGender,
        clinic_result_logged_by: user.email,
        clinic_result_logged_by_name: actorName,
        cat_id: savedCatId,
        cat_name: catDetails.name.trim() || appointment.cat_name,
        cat_colors: catDetails.colors.trim() || appointment.cat_colors,
        cat_gender: resolvedGender,
      })
      .eq("id", appointmentId);

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to log clinic results";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
