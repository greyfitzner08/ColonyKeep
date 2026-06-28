import type { Appointment, ClinicFix } from "@/lib/types";
import { isAutoSyncedClinicFix } from "@/lib/cases/tracked-cat-fix";

const LOGGABLE_STATUSES = new Set(["reserved", "confirmed_transport"]);

type ClinicFixRef = Pick<
  ClinicFix,
  "appointment_id" | "cat_id" | "logged_by" | "age_category" | "gender"
>;

type AppointmentRef = Pick<
  Appointment,
  | "id"
  | "cat_id"
  | "date"
  | "status"
  | "reserved_by"
  | "clinic_result_logged_at"
  | "clinic_result_age_category"
  | "clinic_result_gender"
>;

export function todayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

export function clinicFixForAppointment(
  appointment: Pick<Appointment, "id" | "cat_id">,
  clinicFixes: ClinicFixRef[] = []
): ClinicFixRef | undefined {
  return clinicFixes.find(
    (fix) =>
      fix.appointment_id === appointment.id ||
      (appointment.cat_id != null && fix.cat_id === appointment.cat_id)
  );
}

export function isExplicitClinicFix(fix: Pick<ClinicFix, "logged_by">): boolean {
  return !isAutoSyncedClinicFix(fix);
}

/** True when clinic results were recorded for this appointment or its linked cat. */
export function appointmentClinicResultsLogged(
  appointment: Pick<Appointment, "id" | "cat_id" | "clinic_result_logged_at" | "status">,
  clinicFixes: ClinicFixRef[] = []
): boolean {
  if (appointment.clinic_result_logged_at) return true;
  if (appointment.status === "completed") return true;

  const fix = clinicFixForAppointment(appointment, clinicFixes);
  return Boolean(fix && isExplicitClinicFix(fix));
}

export function appointmentClinicResultSummary(
  appointment: AppointmentRef,
  clinicFixes: ClinicFixRef[] = []
): { ageCategory: "adult" | "kitten"; gender: "male" | "female" } | null {
  if (appointment.clinic_result_age_category && appointment.clinic_result_gender) {
    return {
      ageCategory: appointment.clinic_result_age_category,
      gender: appointment.clinic_result_gender,
    };
  }

  const fix = clinicFixForAppointment(appointment, clinicFixes);
  if (fix && isExplicitClinicFix(fix)) {
    return {
      ageCategory: fix.age_category,
      gender: fix.gender,
    };
  }

  return null;
}

/** True when the appointment date has passed and results have not been logged. */
export function isClinicResultDue(
  appointment: Pick<
    Appointment,
    "id" | "cat_id" | "date" | "status" | "reserved_by" | "clinic_result_logged_at"
  >,
  clinicFixes: ClinicFixRef[] = []
): boolean {
  if (appointmentClinicResultsLogged(appointment, clinicFixes)) return false;
  if (!LOGGABLE_STATUSES.has(appointment.status)) return false;
  if (!appointment.reserved_by?.trim()) return false;
  return appointment.date < todayIsoDate();
}

export function formatClinicResultSummary(input: {
  ageCategory: "adult" | "kitten";
  gender: "male" | "female";
}) {
  const age = input.ageCategory === "adult" ? "adult" : "kitten";
  return `1 ${age} ${input.gender} fixed at clinic`;
}

export function clinicResultAgeLabel(ageCategory: "adult" | "kitten") {
  return ageCategory === "adult" ? "Adult (8+ weeks)" : "Kitten (under 8 weeks)";
}

export function clinicResultGenderLabel(gender: "male" | "female") {
  return gender === "male" ? "Male" : "Female";
}

export function canUnreserveAppointment(
  appointment: Pick<Appointment, "id" | "cat_id" | "status" | "clinic_result_logged_at">,
  clinicFixes: ClinicFixRef[] = []
): boolean {
  if (appointmentClinicResultsLogged(appointment, clinicFixes)) return false;
  return appointment.status === "reserved" || appointment.status === "confirmed_transport";
}

/** Logged appointments show outcome text instead of a status badge. */
export function shouldShowAppointmentStatusBadge(
  appointment: Pick<Appointment, "id" | "cat_id" | "status" | "clinic_result_logged_at">,
  clinicFixes: ClinicFixRef[] = []
): boolean {
  return !appointmentClinicResultsLogged(appointment, clinicFixes);
}
