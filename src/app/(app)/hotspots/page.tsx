import { createClient, createServiceClient } from "@/lib/supabase/server";
import { HotspotsMap, type MapFeeder, type MapVolunteer } from "@/components/maps/hotspots-map";
import type { HelpRequest } from "@/lib/types";

const HOTSPOT_FIELDS =
  "id, case_number, status, colony_address, colony_city, colony_state, colony_zip, colony_county, colony_lat, colony_lng, assigned_team_name, feeder_name, feeder_phone, feeder_email, feeder_street, feeder_city, feeder_state, feeder_zip, feeder_county, feeder_lat, feeder_lng";

export default async function HotspotsPage() {
  const supabase = await createClient();
  const service = await createServiceClient();

  const [{ data, error }, { data: volunteerRows }] = await Promise.all([
    supabase.from("help_requests").select(HOTSPOT_FIELDS).order("created_at", { ascending: false }),
    service
      .from("profiles")
      .select("id, full_name, email, home_lat, home_lng")
      .not("home_lat", "is", null)
      .not("home_lng", "is", null)
      .in("role", ["volunteer", "trap_team_lead"]),
  ]);

  if (error) {
    throw new Error(`Unable to load colony hotspots: ${error.message}`);
  }

  const helpRequests = (data ?? []) as HelpRequest[];
  const volunteers = (volunteerRows ?? []) as MapVolunteer[];
  const feeders = helpRequests
    .filter((hr) => hr.feeder_lat && hr.feeder_lng)
    .map(
      (hr): MapFeeder => ({
        id: hr.id,
        case_number: hr.case_number,
        feeder_name: hr.feeder_name,
        feeder_phone: hr.feeder_phone,
        feeder_email: hr.feeder_email,
        feeder_street: hr.feeder_street,
        feeder_city: hr.feeder_city,
        feeder_state: hr.feeder_state,
        feeder_zip: hr.feeder_zip,
        feeder_county: hr.feeder_county,
        feeder_lat: hr.feeder_lat!,
        feeder_lng: hr.feeder_lng!,
      })
    );

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
