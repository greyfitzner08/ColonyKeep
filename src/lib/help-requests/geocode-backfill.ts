import { geocodeAddress } from "@/lib/geocode";
import type { HelpRequest } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

export async function backfillHelpRequestCoordinates(
  service: SupabaseClient,
  helpRequests: HelpRequest[],
  limit = 25
): Promise<HelpRequest[]> {
  const updated = [...helpRequests];
  let processed = 0;

  for (let index = 0; index < updated.length; index += 1) {
    const hr = updated[index];
    if (hr.colony_lat && hr.colony_lng) continue;
    if (!hr.colony_address && !hr.colony_city && !hr.colony_zip) continue;
    if (processed >= limit) break;

    const coords = await geocodeAddress({
      colony_address: hr.colony_address,
      colony_city: hr.colony_city,
      colony_state: hr.colony_state,
      colony_zip: hr.colony_zip,
      colony_county: hr.colony_county,
    });

    processed += 1;
    if (!coords) continue;

    const { error } = await service
      .from("help_requests")
      .update({ colony_lat: coords.lat, colony_lng: coords.lng })
      .eq("id", hr.id);

    if (!error) {
      updated[index] = { ...hr, colony_lat: coords.lat, colony_lng: coords.lng };
    }

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }

  return updated;
}
