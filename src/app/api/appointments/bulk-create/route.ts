import { NextRequest, NextResponse } from "next/server";
import { requireAppointmentManager } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

function normalizeDateKey(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  return match ? match[1] : null;
}

export async function POST(request: NextRequest) {
  const { response } = await requireAppointmentManager();
  if (response) return response;

  const body = await request.json();
  const clinicId = typeof body.clinic_id === "string" ? body.clinic_id.trim() : "";
  const clinicName = typeof body.clinic_name === "string" ? body.clinic_name.trim() : "";
  const count = Math.max(1, Math.min(50, Number(body.count) || 1));

  const rawDates = Array.isArray(body.dates) ? (body.dates as unknown[]) : [];
  const datesFromList = rawDates
    .map((value) => normalizeDateKey(value))
    .filter((date): date is string => Boolean(date));
  const singleDate = normalizeDateKey(body.date);
  const dates = datesFromList.length > 0 ? [...new Set(datesFromList)] : singleDate ? [singleDate] : [];

  if (!clinicId || !clinicName) {
    return NextResponse.json({ error: "Clinic is required." }, { status: 400 });
  }
  if (dates.length === 0) {
    return NextResponse.json({ error: "At least one date is required." }, { status: 400 });
  }
  if (dates.length > 120) {
    return NextResponse.json(
      { error: "Too many dates in one request. Narrow the recurring range." },
      { status: 400 }
    );
  }

  const slots = dates.flatMap((date) =>
    Array.from({ length: count }, () => ({
      clinic_id: clinicId,
      clinic_name: clinicName,
      date,
      status: "available" as const,
      total_slots: 1,
      reserved_slots: 0,
    }))
  );

  const service = await createServiceClient();
  const { data, error } = await service.from("appointments").insert(slots).select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ appointments: data, created: data?.length ?? 0 });
}
