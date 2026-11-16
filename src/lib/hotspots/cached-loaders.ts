import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin-client";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";
import {
  loadHotspotFeeders,
  loadHotspotHelpRequests,
} from "@/lib/hotspots/load-hotspots-data";
import { loadHotspotClinics, type MapClinic } from "@/lib/hotspots/load-hotspot-clinics";
import { loadHotspotVolunteersWithCoordsOnly } from "@/lib/hotspots/geocode-profile-locations";
import type { MapFeeder } from "@/components/maps/hotspots-map";
import type { HotspotMapVolunteer } from "@/lib/hotspots/volunteer-role-filter";
import type { HelpRequest } from "@/lib/types";

export interface CachedHotspotsPayload {
  helpRequests: HelpRequest[];
  feeders: MapFeeder[];
  clinics: MapClinic[];
  volunteers: HotspotMapVolunteer[];
  error: string | null;
}

async function loadHotspotsPayload(supabase: SupabaseClient): Promise<CachedHotspotsPayload> {
  const [
    { helpRequests, error },
    { feeders, error: feederError },
    { clinics, error: clinicError },
  ] = await Promise.all([
    loadHotspotHelpRequests(supabase),
    loadHotspotFeeders(supabase),
    loadHotspotClinics(supabase),
  ]);

  if (error) {
    return { helpRequests: [], feeders: [], clinics: [], volunteers: [], error };
  }

  if (feederError) {
    return { helpRequests, feeders: [], clinics: [], volunteers: [], error: feederError };
  }

  if (clinicError) {
    return { helpRequests, feeders, clinics: [], volunteers: [], error: clinicError };
  }

  const volunteers = await loadHotspotVolunteersWithCoordsOnly(supabase);

  return { helpRequests, feeders, clinics, volunteers, error: null };
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
      clinics: [],
      volunteers: [],
      error: "Hotspots map requires server admin configuration.",
    };
  }

  return getCachedHotspotsData();
}
