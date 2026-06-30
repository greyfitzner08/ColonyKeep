import { CommunityPartnersManager } from "@/components/community-partners/community-partners-manager";
import { createClient } from "@/lib/supabase/server";
import type { CommunityPartner, CommunityPartnerContact } from "@/lib/types";

type PartnerRow = CommunityPartner & {
  community_partner_contacts?: CommunityPartnerContact[] | null;
};

export default async function CommunityPartnersPage() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("community_partners")
    .select("*, community_partner_contacts(*)")
    .order("name", { ascending: true });

  if (error) {
    throw new Error(`Unable to load community partners: ${error.message}`);
  }

  const partners: CommunityPartner[] = ((data ?? []) as PartnerRow[]).map((row) => ({
    ...row,
    contacts: row.community_partner_contacts ?? [],
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Community Partners</h1>
        <p className="text-muted-foreground">
          Local businesses, rescues, grantors, and other organizations you partner with for events,
          outreach, and fundraising
        </p>
      </div>
      <CommunityPartnersManager partners={partners} />
    </div>
  );
}
