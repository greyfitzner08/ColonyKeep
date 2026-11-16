import { revalidateTag } from "next/cache";
import { NextResponse } from "next/server";
import { requireCaseWorker } from "@/lib/api/auth";
import { backfillClinicCoordinates } from "@/lib/hotspots/geocode-clinic-locations";
import { loadHotspotClinics } from "@/lib/hotspots/load-hotspot-clinics";
import { createServiceClient } from "@/lib/supabase/server";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";

export async function GET() {
  const { response } = await requireCaseWorker();
  if (response) return response;

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ clinics: [] });
  }

  const service = await createServiceClient();
  const { clinics: existing, error } = await loadHotspotClinics(service);

  if (error) {
    return NextResponse.json({ error }, { status: 500 });
  }

  // Backfill a batch of partner clinics that were saved before map coords existed.
  const clinics = await backfillClinicCoordinates(service, 12);
  if (clinics.length > existing.length) {
    revalidateTag("hotspots");
  }

  return NextResponse.json(
    { clinics: clinics.length > 0 ? clinics : existing },
    {
      headers: {
        "Cache-Control": "private, max-age=60",
      },
    }
  );
}
