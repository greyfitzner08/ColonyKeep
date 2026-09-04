import { isAppointmentDatePast } from "@/lib/appointments/slot-date";

/** True when the clinic event calendar date is before today (local). */
export function isEventPastDate(date: string): boolean {
  return isAppointmentDatePast(date);
}

export function eventBookingStatusLabel(event: {
  is_active: boolean;
  date: string;
}): { label: string; variant: "default" | "secondary" | "outline" } {
  if (!event.is_active) {
    return { label: "Inactive", variant: "secondary" };
  }
  if (isEventPastDate(event.date)) {
    return { label: "Active · past date", variant: "outline" };
  }
  return { label: "Active", variant: "default" };
}
