import { NextRequest, NextResponse } from "next/server";
import { requireTrapEquipmentAccess } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireTrapEquipmentAccess();
  if (response) return response;

  const body = await request.json();
  const id = typeof body.id === "string" ? body.id.trim() : "";
  if (!id) {
    return NextResponse.json({ error: "Equipment id is required" }, { status: 400 });
  }

  const service = await createServiceClient();
  const isAdmin = profile!.role === "admin";

  let query = service.from("trap_equipment_items").delete().eq("id", id);
  if (!isAdmin && profile!.team_id) {
    query = query.eq("team_id", profile!.team_id);
  }

  const { error } = await query;

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
