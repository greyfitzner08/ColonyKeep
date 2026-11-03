import { HotspotsShell } from "@/components/maps/hotspots-shell";
import { PageHeader } from "@/components/layout/page-header";
import { getHotspotsData } from "@/lib/hotspots/cached-loaders";
import { applyHotspotContactPrivacy } from "@/lib/hotspots/contact-privacy";
import { getAppProfile } from "@/lib/auth";
import { isCaseWorker, isTrapQueueAssignedOnly } from "@/lib/permissions";

export const revalidate = 300;

export default async function HotspotsPage() {
  const profile = await getAppProfile();
  const isAdmin = profile?.role === "admin";
  const assignedOnly = isTrapQueueAssignedOnly(profile);
  const canEditColonyAddress = isCaseWorker(profile) && !assignedOnly;
  const { helpRequests, feeders, volunteers, error } = await getHotspotsData();
  const privateData = applyHotspotContactPrivacy({
    helpRequests,
    feeders,
    assignedOnly,
    actorEmail: profile?.email,
  });

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

  const coloniesMapped = privateData.helpRequests.filter(
    (hr) => hr.colony_lat && hr.colony_lng
  ).length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Hotspots Map"
        description={[
          assignedOnly
            ? "Colony locations across the service area. Contact details show only for cases assigned to you or that you reported."
            : "Trap queue colonies, volunteers who opted in, and colony feeders across the service area",
          coloniesMapped > 0 ? `${coloniesMapped} colonies mapped` : null,
          privateData.feeders.length > 0
            ? `${privateData.feeders.length} feeder${privateData.feeders.length === 1 ? "" : "s"} mapped`
            : null,
        ]
          .filter(Boolean)
          .join(" · ")}
      />
      <HotspotsShell
        helpRequests={privateData.helpRequests}
        feeders={privateData.feeders}
        initialVolunteers={volunteers}
        isAdmin={isAdmin}
        canEditColonyAddress={canEditColonyAddress}
        assignedOnly={assignedOnly}
      />
    </div>
  );
}
