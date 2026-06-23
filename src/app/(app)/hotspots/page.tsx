import { createServiceClient } from "@/lib/supabase/server";
import { backfillHelpRequestCoordinates } from "@/lib/help-requests/geocode-backfill";
import { HotspotsMap } from "@/components/maps/hotspots-map";
import type { HelpRequest } from "@/lib/types";

export default async function HotspotsPage() {
  const service = await createServiceClient();
  const { data } = await service.from("help_requests").select("*");

  const helpRequests = await backfillHelpRequestCoordinates(
    service,
    (data ?? []) as HelpRequest[]
  );

  const withCoords = helpRequests.filter((hr) => hr.colony_lat && hr.colony_lng);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Colony Hotspots</h1>
        <p className="text-muted-foreground">
          Map of reported cat colonies from the intake queue
          {withCoords.length > 0 && ` · ${withCoords.length} mapped`}
        </p>
      </div>
      <HotspotsMap helpRequests={helpRequests} />
    </div>
  );
}
