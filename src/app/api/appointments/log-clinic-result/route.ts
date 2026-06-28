import { NextRequest, NextResponse } from "next/server";
import { requireAppointmentManager } from "@/lib/api/auth";
import { formatClinicResultSummary, isClinicResultDue } from "@/lib/appointments/clinic-result";
import { normalizeHistoryLog } from "@/lib/cases/history-log";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { HistoryEntry } from "@/lib/types";

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
  const { appointmentId, ageCategory, gender } = body as {
    appointmentId?: string;
    ageCategory?: "adult" | "kitten";
    gender?: "male" | "female";
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

  const summary = formatClinicResultSummary({ ageCategory, gender });
  const loggedAt = new Date().toISOString();
  const actorName = profile!.full_name ?? user.email!;

  const { error: appointmentError } = await service
    .from("appointments")
    .update({
      clinic_result_logged_at: loggedAt,
      clinic_result_age_category: ageCategory,
      clinic_result_gender: gender,
      clinic_result_logged_by: user.email,
      clinic_result_logged_by_name: actorName,
      cat_gender: gender,
    })
    .eq("id", appointmentId);

  if (appointmentError) {
    return NextResponse.json({ error: appointmentError.message }, { status: 400 });
  }

  if (appointment.help_request_id) {
    const { data: helpRequest } = await service
      .from("help_requests")
      .select(
        "id, cats_over_8_weeks, kittens_under_8_weeks, outcome_tnvr_count, history_log, case_number"
      )
      .eq("id", appointment.help_request_id)
      .single();

    if (helpRequest) {
      const adults =
        ageCategory === "adult"
          ? Math.max(0, (helpRequest.cats_over_8_weeks ?? 0) - 1)
          : helpRequest.cats_over_8_weeks ?? 0;
      const kittens =
        ageCategory === "kitten"
          ? Math.max(0, (helpRequest.kittens_under_8_weeks ?? 0) - 1)
          : helpRequest.kittens_under_8_weeks ?? 0;

      const historyEntry: HistoryEntry = {
        timestamp: loggedAt,
        action: "clinic_result",
        actor_email: user.email ?? null,
        actor_name: actorName,
        details: `${summary} (${appointment.clinic_name}, ${appointment.date})`,
        highlighted: true,
        text_color: "green",
      };

      const historyLog = [...normalizeHistoryLog(helpRequest.history_log), historyEntry];

      await service
        .from("help_requests")
        .update({
          cats_over_8_weeks: adults,
          kittens_under_8_weeks: kittens,
          outcome_tnvr_count: (helpRequest.outcome_tnvr_count ?? 0) + 1,
          history_log: historyLog,
        })
        .eq("id", helpRequest.id);
    }
  }

  if (appointment.cat_id) {
    await service
      .from("cats")
      .update({
        gender,
        trapped_status: "fixed",
        return_status: "returned",
        appointment_status: "completed",
      })
      .eq("id", appointment.cat_id);
  }

  return NextResponse.json({ success: true, summary });
}
