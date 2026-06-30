import { CommunityPartnersManager } from "@/components/community-partners/community-partners-manager";
import { createClient } from "@/lib/supabase/server";
import type { CommunityPartner } from "@/lib/types";

export default async function CommunityPartnersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_partners")
    .select("*")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load community partners: ${error.message}`);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Community Partners</h1>
        <p className="text-muted-foreground">
          Local businesses, rescues, grantors, and other organizations you partner with for events,
          outreach, and fundraising
        </p>
      </div>
      <CommunityPartnersManager partners={(data ?? []) as CommunityPartner[]} />
    </div>
  );
}
