import { NextRequest, NextResponse } from "next/server";
import { requireAppointmentManager } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { response } = await requireAppointmentManager();
  if (response) return response;

  const body = await request.json();
  const count = Math.max(1, Number(body.count) || 1);
  const slots = Array.from({ length: count }, () => ({
    clinic_id: body.clinic_id,
    clinic_name: body.clinic_name,
    date: body.date,
    status: "available" as const,
    total_slots: 1,
    reserved_slots: 0,
  }));

  const service = await createServiceClient();
  const { data, error } = await service.from("appointments").insert(slots).select();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ appointments: data });
}
