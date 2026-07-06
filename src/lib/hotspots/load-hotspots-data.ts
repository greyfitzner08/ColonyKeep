import type { SupabaseClient } from "@supabase/supabase-js";
import type { MapFeeder } from "@/components/maps/hotspots-map";
import { HOTSPOT_COLONY_STATUSES } from "@/lib/cases/statuses";
import { loadHotspotVolunteers } from "@/lib/hotspots/geocode-profile-locations";
import type { HelpRequest } from "@/lib/types";

const COLONY_HOTSPOT_FIELDS =
  "id, case_number, status, colony_address, colony_city, colony_state, colony_zip, colony_county, colony_lat, colony_lng, assigned_team_name";

export { COLONY_HOTSPOT_FIELDS };

const FEEDER_HOTSPOT_FIELDS =
  "feeder_name, feeder_phone, feeder_email, feeder_street, feeder_city, feeder_state, feeder_zip, feeder_county, feeder_lat, feeder_lng";

function isMissingColumnError(message: string | undefined) {
  return Boolean(message?.includes("column") && message.includes("does not exist"));
}

export async function loadHotspotHelpRequests(
  supabase: SupabaseClient
): Promise<{ helpRequests: HelpRequest[]; error: string | null }> {
  const result = await supabase
    .from("help_requests")
    .select(COLONY_HOTSPOT_FIELDS)
    .in("status", HOTSPOT_COLONY_STATUSES)
    .order("created_at", { ascending: false });

  if (result.error) {
    return { helpRequests: [], error: result.error.message };
  }

  return { helpRequests: (result.data ?? []) as HelpRequest[], error: null };
}

const FEEDER_MAP_FIELDS = `id, case_number, ${FEEDER_HOTSPOT_FIELDS}`;

/** Feeders stay visible across trap workflow — not limited to colony hotspot statuses. */
export async function loadHotspotFeeders(
  supabase: SupabaseClient
): Promise<{ feeders: MapFeeder[]; error: string | null }> {
  const result = await supabase
    .from("help_requests")
    .select(FEEDER_MAP_FIELDS)
    .not("feeder_lat", "is", null)
    .not("feeder_lng", "is", null)
    .order("updated_at", { ascending: false });

  if (isMissingColumnError(result.error?.message)) {
    return { feeders: [], error: null };
  }

  if (result.error) {
    return { feeders: [], error: result.error.message };
  }

  return {
    feeders: mapFeedersFromHelpRequests((result.data ?? []) as HelpRequest[]),
    error: null,
  };
}

export { loadHotspotVolunteers };

export function mapFeedersFromHelpRequests(helpRequests: HelpRequest[]): MapFeeder[] {
  return helpRequests
    .filter((hr) => hr.feeder_lat && hr.feeder_lng)
    .map(
      (hr): MapFeeder => ({
        id: hr.id,
        case_number: hr.case_number,
        feeder_name: hr.feeder_name ?? null,
        feeder_phone: hr.feeder_phone ?? null,
        feeder_email: hr.feeder_email ?? null,
        feeder_street: hr.feeder_street ?? null,
        feeder_city: hr.feeder_city ?? null,
        feeder_state: hr.feeder_state ?? null,
        feeder_zip: hr.feeder_zip ?? null,
        feeder_county: hr.feeder_county ?? null,
        feeder_lat: hr.feeder_lat!,
        feeder_lng: hr.feeder_lng!,
      })
    );
}
