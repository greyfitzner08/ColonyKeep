import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";
import {
  loadHotspotFeeders,
  loadHotspotHelpRequests,
  loadHotspotVolunteers,
} from "@/lib/hotspots/load-hotspots-data";
import { backfillHelpRequestCoordinates } from "@/lib/help-requests/geocode-backfill";
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

  const geocodedHelpRequests = await backfillHelpRequestCoordinates(supabase, helpRequests, 15);
  const volunteers = await loadHotspotVolunteers(supabase, { geocodeLimit: 15 });

  return { helpRequests: geocodedHelpRequests, feeders, volunteers, error: null };
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
