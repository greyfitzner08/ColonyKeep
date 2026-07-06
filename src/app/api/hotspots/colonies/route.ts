import { NextResponse } from "next/server";
import { requireCaseWorker } from "@/lib/api/auth";
import { loadHotspotHelpRequests } from "@/lib/hotspots/load-hotspots-data";
import { backfillHelpRequestCoordinates } from "@/lib/help-requests/geocode-backfill";
import { createServiceClient } from "@/lib/supabase/server";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";

export async function GET() {
  const { response } = await requireCaseWorker();
  if (response) return response;

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ helpRequests: [] });
  }

  const service = await createServiceClient();
  const { helpRequests, error } = await loadHotspotHelpRequests(service);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  const geocodedHelpRequests = await backfillHelpRequestCoordinates(service, helpRequests, 8);

  return NextResponse.json(
    { helpRequests: geocodedHelpRequests },
    {
      headers: {
        "Cache-Control": "private, max-age=300",
      },
    }
  );
}
