/** Shared month-grid helpers for appointment calendars. */

export const APPOINTMENT_WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"] as const;

export function toDateKey(date: Date): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Normalize DB/calendar date strings to YYYY-MM-DD for grouping. */
export function appointmentDateKey(date: string): string {
  const trimmed = date.trim();
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  return match ? match[1] : trimmed.slice(0, 10);
}

export function buildMonthGrid(year: number, month: number) {
  const firstDay = new Date(year, month, 1);
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startWeekday = firstDay.getDay();
  const totalCells = Math.ceil((startWeekday + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayOffset = index - startWeekday + 1;
    const date = new Date(year, month, dayOffset);
    return {
      date: toDateKey(date),
      day: date.getDate(),
      inMonth: date.getMonth() === month,
    };
  });
}

export function monthLabel(year: number, month: number) {
  return new Date(year, month, 1).toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
}

export function groupAppointmentsByDate<T extends { date: string }>(
  appointments: T[]
): Record<string, T[]> {
  return appointments.reduce(
    (acc, appt) => {
      const key = appointmentDateKey(appt.date);
      if (!acc[key]) acc[key] = [];
      acc[key].push(appt);
      return acc;
    },
    {} as Record<string, T[]>
  );
}
