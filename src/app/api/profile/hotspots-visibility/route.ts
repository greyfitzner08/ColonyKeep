import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole([
    "admin",
    "volunteer",
    "inquiry_team",
    "trap_team_lead",
  ]);
  if (response) return response;

  const body = await request.json();
  const showOnHotspotsMap = body.showOnHotspotsMap ?? body.show_on_hotspots_map;

  if (typeof showOnHotspotsMap !== "boolean") {
    return NextResponse.json({ error: "showOnHotspotsMap must be a boolean" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await service
    .from("profiles")
    .update({ show_on_hotspots_map: showOnHotspotsMap })
    .eq("id", profile!.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, showOnHotspotsMap });
}
