import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCaseNumber(seq: number): string {
  return `CASE-${String(seq).padStart(5, "0")}`;
}

/** Parse calendar dates as local days so YYYY-MM-DD is not shifted by timezone. */
function toDisplayDate(date: string | Date): Date {
  if (date instanceof Date) return date;
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(date.trim());
  if (match) {
    const year = Number(match[1]);
    const month = Number(match[2]) - 1;
    const day = Number(match[3]);
    return new Date(year, month, day);
  }
  return new Date(date);
}

function pad2(value: number): string {
  return String(value).padStart(2, "0");
}

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
] as const;

const MONTH_LOOKUP = Object.fromEntries(
  MONTH_NAMES.flatMap((name, index) => [
    [name.toLowerCase(), index + 1],
    [name.slice(0, 3).toLowerCase(), index + 1],
  ])
) as Record<string, number>;

function toIsoDate(year: number, month: number, day: number): string | null {
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

/** Display dates as "4 September 2026" app-wide. */
export function formatDate(date: string | Date): string {
  const d = toDisplayDate(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
}

/**
 * Parse a display date into YYYY-MM-DD.
 * Accepts "4 September 2026", "4 Sept 2026", or "DD-MM-YYYY".
 */
export function parseDisplayDate(value: string): string | null {
  const trimmed = value.trim().replace(/\s+/g, " ");

  const named = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(trimmed);
  if (named) {
    const day = Number(named[1]);
    const month = MONTH_LOOKUP[named[2].toLowerCase()];
    const year = Number(named[3]);
    if (!month) return null;
    return toIsoDate(year, month, day);
  }

  const numeric = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(trimmed);
  if (numeric) {
    return toIsoDate(Number(numeric[3]), Number(numeric[2]), Number(numeric[1]));
  }

  return null;
}

export function formatDateTime(date: string | Date): string {
  if (typeof date === "string" && /^\d{4}-\d{2}-\d{2}$/.test(date.trim())) {
    return formatDate(date);
  }
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const datePart = formatDate(d);
  const timePart = d.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
  return `${datePart} ${timePart}`;
}

/** Display HH:MM / HH:MM:SS as 12-hour time (e.g. 2:30 PM). */
export function formatTime(time: string): string {
  const match = /^(\d{1,2}):(\d{2})/.exec(time.trim());
  if (!match) return time;
  let hours = Number(match[1]);
  const minutes = match[2];
  if (!Number.isFinite(hours) || hours < 0 || hours > 23) return time;
  const period = hours >= 12 ? "PM" : "AM";
  hours = hours % 12;
  if (hours === 0) hours = 12;
  return `${hours}:${minutes} ${period}`;
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`;
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(amount);
}
