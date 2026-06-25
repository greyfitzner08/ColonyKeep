import { createClient, createServiceClient } from "@/lib/supabase/server";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";
import { HotspotsMap } from "@/components/maps/hotspots-map";
import {
  loadHotspotHelpRequests,
  loadHotspotVolunteers,
  mapFeedersFromHelpRequests,
} from "@/lib/hotspots/load-hotspots-data";

export default async function HotspotsPage() {
  const supabase = await createClient();
  const { helpRequests, error } = await loadHotspotHelpRequests(supabase);

  if (error) {
    throw new Error(`Unable to load colony hotspots: ${error}`);
  }

  const volunteers = hasSupabaseAdminConfig()
    ? await loadHotspotVolunteers(await createServiceClient())
    : [];

  const feeders = mapFeedersFromHelpRequests(helpRequests);
  const coloniesMapped = helpRequests.filter((hr) => hr.colony_lat && hr.colony_lng).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Hotspots Map</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Colonies, volunteers, and colony feeders across the service area
          {coloniesMapped > 0 && ` · ${coloniesMapped} colonies mapped`}
        </p>
      </div>
      <HotspotsMap helpRequests={helpRequests} volunteers={volunteers} feeders={feeders} />
    </div>
  );
}
