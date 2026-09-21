import { HotspotsShell } from "@/components/maps/hotspots-shell";
import { PageHeader } from "@/components/layout/page-header";
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
      <div className="space-y-6">
        <PageHeader
          title="Hotspots Map"
          description={
            <p className="max-w-3xl text-destructive leading-relaxed">
              Unable to load colony hotspots: {error}
            </p>
          }
        />
      </div>
    );
  }

  const coloniesMapped = helpRequests.filter((hr) => hr.colony_lat && hr.colony_lng).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hotspots Map"
        description={[
          "Trap queue colonies, volunteers who opted in, and colony feeders across the service area",
          coloniesMapped > 0 ? `${coloniesMapped} colonies mapped` : null,
          feeders.length > 0
            ? `${feeders.length} feeder${feeders.length === 1 ? "" : "s"} mapped`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />
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
