import { unstable_cache } from "next/cache";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";
import {
  loadHotspotFeeders,
  loadHotspotHelpRequests,
} from "@/lib/hotspots/load-hotspots-data";
import { loadHotspotVolunteersWithCoordsOnly } from "@/lib/hotspots/geocode-profile-locations";
import type { MapFeeder } from "@/components/maps/hotspots-map";
import type { HotspotMapVolunteer } from "@/lib/hotspots/volunteer-role-filter";
import type { HelpRequest } from "@/lib/types";

export interface CachedHotspotsPayload {
  helpRequests: HelpRequest[];
  feeders: MapFeeder[];
  volunteers: HotspotMapVolunteer[];
  error: string | null;
}

async function fetchHotspotsPayload(): Promise<CachedHotspotsPayload> {
  const supabase = await createClient();
  const [{ helpRequests, error }, { feeders, error: feederError }] = await Promise.all([
    loadHotspotHelpRequests(supabase),
    loadHotspotFeeders(supabase),
  ]);

  if (error) {
    return { helpRequests: [], feeders: [], volunteers: [], error };
  }

  if (feederError) {
    return { helpRequests, feeders: [], volunteers: [], error: feederError };
  }

  let volunteers: HotspotMapVolunteer[] = [];
  if (hasSupabaseAdminConfig()) {
    const service = await createServiceClient();
    volunteers = await loadHotspotVolunteersWithCoordsOnly(service);
  }

  return { helpRequests, feeders, volunteers, error: null };
}

export const getCachedHotspotsData = unstable_cache(
  fetchHotspotsPayload,
  ["hotspots-map-data"],
  { revalidate: 300, tags: ["hotspots"] }
);
