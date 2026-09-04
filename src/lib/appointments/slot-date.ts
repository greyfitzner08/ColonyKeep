/** Local calendar YYYY-MM-DD for "today". */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

/** Parse YYYY-MM-DD as a local calendar date (avoids UTC off-by-one). */
export function parseLocalDateKey(dateKey: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(dateKey.trim());
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const date = new Date(year, month - 1, day);
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day
  ) {
    return null;
  }
  return date;
}

/**
 * Dates from start–end (inclusive) that fall on the selected weekdays (0=Sun … 6=Sat).
 */
export function enumerateRecurringDates(
  startDate: string,
  endDate: string,
  weekdays: number[]
): string[] {
  const start = parseLocalDateKey(startDate);
  const end = parseLocalDateKey(endDate);
  if (!start || !end || end < start) return [];

  const weekdaySet = new Set(weekdays.filter((day) => day >= 0 && day <= 6));
  if (weekdaySet.size === 0) return [];

  const dates: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    if (weekdaySet.has(cursor.getDay())) {
      dates.push(localDateKey(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return dates;
}

/** True when the appointment calendar date is before today (local). */
export function isAppointmentDatePast(
  date: string,
  today: Date | string = new Date()
): boolean {
  const day = date.trim().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(day)) return false;
  const todayKey = typeof today === "string" ? today.slice(0, 10) : localDateKey(today);
  return day < todayKey;
}
