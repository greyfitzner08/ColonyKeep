import { NextResponse } from "next/server";
import { requireCaseWorker } from "@/lib/api/auth";
import { loadHotspotVolunteers } from "@/lib/hotspots/geocode-profile-locations";
import { createServiceClient } from "@/lib/supabase/server";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";

export async function GET() {
  const { response } = await requireCaseWorker();
  if (response) return response;

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ volunteers: [] });
  }

  const service = await createServiceClient();
  const volunteers = await loadHotspotVolunteers(service, { geocodeLimit: 8 });

  return NextResponse.json(
    { volunteers },
    {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    }
  );
}
