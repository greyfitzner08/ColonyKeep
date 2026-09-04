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
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(date.trim());
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

/** Display dates as DD-MM-YYYY app-wide. */
export function formatDate(date: string | Date): string {
  const d = toDisplayDate(date);
  if (Number.isNaN(d.getTime())) return "";
  return `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
}

/** Parse a DD-MM-YYYY display date into YYYY-MM-DD, or null if invalid. */
export function parseDisplayDate(value: string): string | null {
  const match = /^(\d{1,2})-(\d{1,2})-(\d{4})$/.exec(value.trim());
  if (!match) return null;
  const day = Number(match[1]);
  const month = Number(match[2]);
  const year = Number(match[3]);
  if (!Number.isFinite(day) || !Number.isFinite(month) || !Number.isFinite(year)) return null;
  const d = new Date(year, month - 1, day);
  if (d.getFullYear() !== year || d.getMonth() !== month - 1 || d.getDate() !== day) {
    return null;
  }
  return `${year}-${pad2(month)}-${pad2(day)}`;
}

export function formatDateTime(date: string | Date): string {
  const d = new Date(date);
  if (Number.isNaN(d.getTime())) return "";
  const datePart = `${pad2(d.getDate())}-${pad2(d.getMonth() + 1)}-${d.getFullYear()}`;
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
