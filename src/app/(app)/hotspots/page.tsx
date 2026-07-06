import { HotspotsShell } from "@/components/maps/hotspots-shell";
import { getHotspotsData } from "@/lib/hotspots/cached-loaders";
import { getAppProfile } from "@/lib/auth";
import { isCaseWorker } from "@/lib/permissions";

export const revalidate = 300;

export default async function HotspotsPage() {
  const profile = await getAppProfile();
  const isAdmin = profile?.role === "admin";
  const canEditColonyAddress = isCaseWorker(profile);
  const { helpRequests, feeders, volunteers, error } = await getHotspotsData();

  if (error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-2xl font-bold sm:text-3xl">Hotspots Map</h1>
          <p className="text-sm text-destructive sm:text-base">
            Unable to load colony hotspots: {error}
          </p>
        </div>
      </div>
    );
  }

  const coloniesMapped = helpRequests.filter((hr) => hr.colony_lat && hr.colony_lng).length;

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-2xl font-bold sm:text-3xl">Hotspots Map</h1>
        <p className="text-sm text-muted-foreground sm:text-base">
          Inquiry and trap queue colonies, volunteers who opted in, and colony feeders across the
          service area
          {coloniesMapped > 0 && ` · ${coloniesMapped} colonies mapped`}
          {feeders.length > 0 && ` · ${feeders.length} feeder${feeders.length === 1 ? "" : "s"} mapped`}
        </p>
      </div>
      <HotspotsShell
        helpRequests={helpRequests}
        feeders={feeders}
        initialVolunteers={volunteers}
        isAdmin={isAdmin}
        canEditColonyAddress={canEditColonyAddress}
      />
    </div>
  );
}
