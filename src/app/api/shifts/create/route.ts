import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const service = await createServiceClient();
  const { data, error } = await service
    .from("shifts")
    .insert({
      event_name: body.event_name,
      shift_type: body.shift_type,
      required_roles: body.required_roles ?? "any",
      date: body.date,
      start_time: body.start_time,
      end_time: body.end_time,
      location: body.location,
      volunteers_needed: body.volunteers_needed ?? 1,
      notes: body.notes ?? null,
      team_ids: body.team_ids ?? [],
      signed_up_emails: [],
    })
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ shift: data });
}
