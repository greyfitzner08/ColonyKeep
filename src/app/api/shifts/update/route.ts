import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  if (!body.id) {
    return NextResponse.json({ error: "Missing shift id" }, { status: 400 });
  }

  const positionName = String(body.position_name ?? "").trim();
  if (!positionName) {
    return NextResponse.json({ error: "Position name is required." }, { status: 400 });
  }

  const service = await createServiceClient();
  const { data, error } = await service
    .from("shifts")
    .update({
      event_name: body.event_name,
      position_name: positionName,
      shift_type: body.shift_type,
      required_roles: body.required_roles ?? "any",
      date: body.date,
      start_time: body.start_time,
      end_time: body.end_time,
      location: body.location,
      volunteers_needed: body.volunteers_needed ?? 1,
      notes: body.notes ?? null,
    })
    .eq("id", body.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ shift: data });
}
