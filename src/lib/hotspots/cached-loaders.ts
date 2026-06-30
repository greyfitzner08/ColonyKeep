import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
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

  let volunteers: HotspotMapVolunteer[] = [];
  if (hasSupabaseAdminConfig()) {
    const service = await createServiceClient();
    volunteers = await loadHotspotVolunteersWithCoordsOnly(service);
  }

  return { helpRequests, feeders, volunteers, error: null };
}

/** Cached loader — must not call cookies()/headers(); uses service role only. */
async function fetchHotspotsPayloadWithServiceRole(): Promise<CachedHotspotsPayload> {
  const service = await createServiceClient();
  return loadHotspotsPayload(service);
}

export const getCachedHotspotsData = unstable_cache(
  fetchHotspotsPayloadWithServiceRole,
  ["hotspots-map-data"],
  { revalidate: 300, tags: ["hotspots"] }
);

export async function getHotspotsData(): Promise<CachedHotspotsPayload> {
  if (hasSupabaseAdminConfig()) {
    return getCachedHotspotsData();
  }

  const supabase = await createClient();
  return loadHotspotsPayload(supabase);
}
