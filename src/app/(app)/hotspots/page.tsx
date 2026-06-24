import { createClient } from "@/lib/supabase/server";
import { HotspotsMap } from "@/components/maps/hotspots-map";
import type { HelpRequest } from "@/lib/types";

const HOTSPOT_FIELDS =
  "id, case_number, status, colony_address, colony_city, colony_state, colony_zip, colony_county, colony_lat, colony_lng, assigned_team_name";

export default async function HotspotsPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("help_requests")
    .select(HOTSPOT_FIELDS)
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(`Unable to load colony hotspots: ${error.message}`);
  }

  const helpRequests = (data ?? []) as HelpRequest[];

  const withCoords = helpRequests.filter((hr) => hr.colony_lat && hr.colony_lng);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Colony Hotspots</h1>
        <p className="text-muted-foreground">
          Map of reported cat colonies from the inquiry queue
          {withCoords.length > 0 && ` · ${withCoords.length} mapped`}
        </p>
      </div>
      <HotspotsMap helpRequests={helpRequests} />
    </div>
  );
}
