import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { canAccessAdoptions } from "@/lib/permissions";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole([
    "admin",
    "volunteer",
    "inquiry_team",
    "trap_team_lead",
  ]);
  if (response) return response;
  if (!canAccessAdoptions(profile)) {
    return NextResponse.json({ error: "Adoption access required" }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  const id = typeof body?.id === "string" ? body.id : "";
  if (!id) return NextResponse.json({ error: "Missing location id" }, { status: 400 });

  const service = await createServiceClient();
  const { count } = await service
    .from("adoptable_cats")
    .select("id", { count: "exact", head: true })
    .eq("location_id", id);

  if ((count ?? 0) > 0) {
    return NextResponse.json(
      { error: "Move or reassign cats at this location before deleting it." },
      { status: 400 }
    );
  }

  const { error } = await service.from("adoption_locations").delete().eq("id", id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
