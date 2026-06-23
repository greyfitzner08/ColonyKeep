import type { Shift } from "@/lib/types";

export function getShiftStart(date: string, startTime: string): Date {
  const normalizedTime = startTime.length === 5 ? `${startTime}:00` : startTime;
  return new Date(`${date}T${normalizedTime}`);
}

export function getShiftEnd(date: string, endTime: string): Date {
  const normalizedTime = endTime.length === 5 ? `${endTime}:00` : endTime;
  return new Date(`${date}T${normalizedTime}`);
}

export type ShiftTiming = "upcoming" | "in_progress" | "ended";

export function getShiftTiming(shift: Shift, now = new Date()): ShiftTiming {
  const start = getShiftStart(shift.date, shift.start_time);
  const end = getShiftEnd(shift.date, shift.end_time);

  if (now >= end) return "ended";
  if (now >= start) return "in_progress";
  return "upcoming";
}
