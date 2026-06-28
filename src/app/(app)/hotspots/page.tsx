import { HotspotsShell } from "@/components/maps/hotspots-shell";
import { getCachedHotspotsData } from "@/lib/hotspots/cached-loaders";

export const revalidate = 300;

export default async function HotspotsPage() {
  const { helpRequests, feeders, volunteers, error } = await getCachedHotspotsData();

  if (error) {
    throw new Error(`Unable to load colony hotspots: ${error}`);
  }

  const coloniesMapped = helpRequests.filter((hr) => hr.colony_lat && hr.colony_lng).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Hotspots Map</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Open intake colonies, closed cases, volunteers, and colony feeders across the service area
          {coloniesMapped > 0 && ` · ${coloniesMapped} colonies mapped`}
          {feeders.length > 0 && ` · ${feeders.length} feeder${feeders.length === 1 ? "" : "s"} mapped`}
        </p>
      </div>
      <HotspotsShell
        helpRequests={helpRequests}
        feeders={feeders}
        initialVolunteers={volunteers}
      />
    </div>
  );
}
