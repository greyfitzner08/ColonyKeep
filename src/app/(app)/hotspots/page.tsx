import { createClient } from "@/lib/supabase/server";
import { HotspotsMap } from "@/components/maps/hotspots-map";
import type { HelpRequest } from "@/lib/types";

export default async function HotspotsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("help_requests").select("*");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Colony Hotspots</h1>
        <p className="text-muted-foreground">Map of reported cat colonies by status</p>
      </div>
      <HotspotsMap helpRequests={(data ?? []) as HelpRequest[]} />
    </div>
  );
}
