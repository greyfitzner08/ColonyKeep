/** Local calendar YYYY-MM-DD for "today". */
export function localDateKey(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
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
