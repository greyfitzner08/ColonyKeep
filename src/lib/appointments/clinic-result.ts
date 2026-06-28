import type { Appointment } from "@/lib/types";

const LOGGABLE_STATUSES = new Set(["reserved", "confirmed_transport"]);

export function todayIsoDate() {
  return new Date().toISOString().split("T")[0];
}

/** True when the appointment date has passed and results have not been logged. */
export function isClinicResultDue(
  appointment: Pick<
    Appointment,
    "date" | "status" | "reserved_by" | "clinic_result_logged_at"
  >
): boolean {
  if (!LOGGABLE_STATUSES.has(appointment.status)) return false;
  if (!appointment.reserved_by?.trim()) return false;
  if (appointment.clinic_result_logged_at) return false;
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
