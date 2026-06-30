import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin-client";
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

async function loadHotspotsPayload(supabase: SupabaseClient): Promise<CachedHotspotsPayload> {
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

  const volunteers = await loadHotspotVolunteersWithCoordsOnly(supabase);

  return { helpRequests, feeders, volunteers, error: null };
}

/** Cached loader — must not import cookie-based Supabase clients. */
async function fetchHotspotsPayloadWithServiceRole(): Promise<CachedHotspotsPayload> {
  const service = createAdminClient();
  return loadHotspotsPayload(service);
}

export const getCachedHotspotsData = unstable_cache(
  fetchHotspotsPayloadWithServiceRole,
  ["hotspots-map-data"],
  { revalidate: 300, tags: ["hotspots"] }
);

export async function getHotspotsData(): Promise<CachedHotspotsPayload> {
  if (!hasSupabaseAdminConfig()) {
    return {
      helpRequests: [],
      feeders: [],
      volunteers: [],
      error: "Hotspots map requires server admin configuration.",
    };
  }

  return getCachedHotspotsData();
}
