import type { SupabaseClient } from "@supabase/supabase-js";
import type { MapFeeder } from "@/components/maps/hotspots-map";
import { loadHotspotVolunteers } from "@/lib/hotspots/geocode-profile-locations";
import type { HelpRequest } from "@/lib/types";

const COLONY_HOTSPOT_FIELDS =
  "id, case_number, status, colony_address, colony_city, colony_state, colony_zip, colony_county, colony_lat, colony_lng, assigned_team_name";

const FEEDER_HOTSPOT_FIELDS =
  "feeder_name, feeder_phone, feeder_email, feeder_street, feeder_city, feeder_state, feeder_zip, feeder_county, feeder_lat, feeder_lng";

function isMissingColumnError(message: string | undefined) {
  return Boolean(message?.includes("column") && message.includes("does not exist"));
}

export async function loadHotspotHelpRequests(
  supabase: SupabaseClient
): Promise<{ helpRequests: HelpRequest[]; error: string | null }> {
  const extendedFields = `${COLONY_HOTSPOT_FIELDS}, ${FEEDER_HOTSPOT_FIELDS}`;
  const extendedResult = await supabase
    .from("help_requests")
    .select(extendedFields)
    .order("created_at", { ascending: false });

  if (!isMissingColumnError(extendedResult.error?.message)) {
    if (extendedResult.error) {
      return { helpRequests: [], error: extendedResult.error.message };
    }
    return { helpRequests: (extendedResult.data ?? []) as HelpRequest[], error: null };
  }

  const colonyResult = await supabase
    .from("help_requests")
    .select(COLONY_HOTSPOT_FIELDS)
    .order("created_at", { ascending: false });

  if (colonyResult.error) {
    return { helpRequests: [], error: colonyResult.error.message };
  }

  return { helpRequests: (colonyResult.data ?? []) as HelpRequest[], error: null };
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
