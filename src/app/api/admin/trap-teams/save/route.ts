import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const service = await createServiceClient();
  const payload = {
    name: body.name,
    region: body.region,
    zip_codes: body.zip_codes ?? [],
    members: body.members ?? [],
    lead_email: body.lead_email,
    notes: body.notes ?? null,
    is_active: body.is_active ?? true,
  };

  const query = body.id
    ? service.from("trap_teams").update(payload).eq("id", body.id)
    : service.from("trap_teams").insert(payload);

  const { data, error } = await query.select().single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ team: data });
}
