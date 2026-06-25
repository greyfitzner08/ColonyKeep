/** UTC calendar date (YYYY-MM-DD) for comparisons with Postgres DATE columns. */
export function todayIsoDate(): string {
  return new Date().toISOString().split("T")[0];
}

export function isEventPastDate(date: string): boolean {
  return date < todayIsoDate();
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
