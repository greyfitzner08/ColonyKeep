import { CommunityPartnersManager } from "@/components/community-partners/community-partners-manager";
import { PageHeader } from "@/components/layout/page-header";
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
      <PageHeader
        title="Community Partners"
        description="Local businesses, rescues, grantors, and other organizations you partner with for events, outreach, and fundraising"
      />
      <CommunityPartnersManager partners={partners} />
    </div>
  );
}
