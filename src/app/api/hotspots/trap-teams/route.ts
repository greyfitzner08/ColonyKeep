import { NextResponse } from "next/server";
import { requireCaseWorker } from "@/lib/api/auth";
import { loadTrapTeamAreas } from "@/lib/hotspots/trap-team-areas";
import { createServiceClient } from "@/lib/supabase/server";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";

export async function GET() {
  const { response } = await requireCaseWorker();
  if (response) return response;

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ teams: [], features: [], error: null });
  }

  const service = await createServiceClient();
  const areas = await loadTrapTeamAreas(service);

  if (areas.error && areas.teams.length === 0) {
    return NextResponse.json({ error: areas.error }, { status: 500 });
  }

  return NextResponse.json(areas, {
    headers: {
      "Cache-Control": "private, max-age=300",
    },
  });
}
