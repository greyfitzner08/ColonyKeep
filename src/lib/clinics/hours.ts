import { formatTime, formatTimeRange } from "@/lib/utils";

export const CLINIC_WEEKDAYS = [
  "Monday",
  "Tuesday",
  "Wednesday",
  "Thursday",
  "Friday",
  "Saturday",
  "Sunday",
] as const;

export type ClinicWeekday = (typeof CLINIC_WEEKDAYS)[number];

export interface ClinicDayHours {
  open: string;
  close: string;
}

export type ClinicHoursByDay = Partial<Record<ClinicWeekday, ClinicDayHours>>;

const WEEKDAY_SET = new Set<string>(CLINIC_WEEKDAYS);
const TIME_RE = /^([01]\d|2[0-3]):([0-5]\d)$/;

function isWeekday(value: string): value is ClinicWeekday {
  return WEEKDAY_SET.has(value);
}

function normalizeTime(value: unknown): string {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  const match = /^(\d{1,2}):([0-5]\d)/.exec(trimmed);
  if (!match) return "";
  const hours = Number(match[1]);
  if (!Number.isFinite(hours) || hours < 0 || hours > 23) return "";
  return `${String(hours).padStart(2, "0")}:${match[2]}`;
}

function normalizeDayHours(value: unknown): ClinicDayHours | null {
  if (!value || typeof value !== "object") return null;
  const record = value as Record<string, unknown>;
  const open = normalizeTime(record.open);
  const close = normalizeTime(record.close);
  if (!open && !close) return null;
  return { open, close };
}

export function normalizeClinicHours(value: unknown): ClinicHoursByDay {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const next: ClinicHoursByDay = {};
  for (const [day, hours] of Object.entries(value as Record<string, unknown>)) {
    if (!isWeekday(day)) continue;
    const normalized = normalizeDayHours(hours);
    if (normalized) next[day] = normalized;
  }
  return next;
}

export function pruneClinicHours(
  days: string[],
  hours: ClinicHoursByDay
): ClinicHoursByDay {
  const allowed = new Set(days.filter(isWeekday));
  const next: ClinicHoursByDay = {};
  for (const day of CLINIC_WEEKDAYS) {
    if (!allowed.has(day) || !hours[day]) continue;
    next[day] = hours[day];
  }
  return next;
}

export function applySameClinicHours(
  days: string[],
  open: string,
  close: string
): ClinicHoursByDay {
  const hours = normalizeDayHours({ open, close });
  if (!hours) return {};
  const next: ClinicHoursByDay = {};
  for (const day of days) {
    if (!isWeekday(day)) continue;
    next[day] = hours;
  }
  return next;
}

export function clinicHoursAreUniform(days: string[], hours: ClinicHoursByDay): boolean {
  const recorded = days
    .filter(isWeekday)
    .map((day) => hours[day])
    .filter((entry): entry is ClinicDayHours => Boolean(entry));
  if (recorded.length <= 1) return true;
  const first = `${recorded[0].open}|${recorded[0].close}`;
  return recorded.every((entry) => `${entry.open}|${entry.close}` === first);
}

export function sharedClinicHours(
  days: string[],
  hours: ClinicHoursByDay
): ClinicDayHours {
  for (const day of days) {
    if (!isWeekday(day)) continue;
    const entry = hours[day];
    if (entry) return entry;
  }
  return { open: "", close: "" };
}

export function orderedClinicDays(days: string[]): ClinicWeekday[] {
  const selected = new Set(days);
  return CLINIC_WEEKDAYS.filter((day) => selected.has(day));
}

export function formatClinicDayHours(hours?: ClinicDayHours | null): string {
  if (!hours) return "";
  if (hours.open && hours.close) return formatTimeRange(hours.open, hours.close);
  if (hours.open) return `from ${formatTime(hours.open)}`;
  if (hours.close) return `until ${formatTime(hours.close)}`;
  return "";
}

export function formatClinicHoursSummary(
  days: string[],
  hours: ClinicHoursByDay
): string {
  const openDays = days.filter(isWeekday);
  if (openDays.length === 0) return "";
  if (clinicHoursAreUniform(openDays, hours)) {
    const shared = formatClinicDayHours(sharedClinicHours(openDays, hours));
    return shared;
  }
  return openDays
    .map((day) => {
      const label = formatClinicDayHours(hours[day]);
      return label ? `${day.slice(0, 3)} ${label}` : null;
    })
    .filter(Boolean)
    .join(" · ");
}

export function isValidClinicTime(value: string): boolean {
  return value === "" || TIME_RE.test(value);
}
