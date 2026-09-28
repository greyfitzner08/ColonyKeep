import { redirect } from "next/navigation";
import { getAppProfile } from "@/lib/auth";
import { canAccessAdoptions } from "@/lib/permissions";
import { createServiceClient } from "@/lib/supabase/server";
import { AdoptableCatsManager } from "@/components/adoption/adoptable-cats-manager";
import { PageHeader } from "@/components/layout/page-header";
import type { AdoptableCat, AdoptionLocation } from "@/lib/adoption/constants";

export default async function AdoptionPage() {
  const profile = await getAppProfile();
  if (!canAccessAdoptions(profile)) redirect("/");

  const service = await createServiceClient();
  const [{ data: cats }, { data: locations }] = await Promise.all([
    service
      .from("adoptable_cats")
      .select("*, location:adoption_locations(*)")
      .order("name"),
    service.from("adoption_locations").select("*").order("name"),
  ]);

  const locationRows = (locations ?? []) as AdoptionLocation[];
  const catRows = ((cats ?? []) as AdoptableCat[]).map((cat) => ({
    ...cat,
    location: Array.isArray(cat.location) ? cat.location[0] ?? null : cat.location ?? null,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adoptable Cats"
        description="Track cats in the program. The adoption application is for a person who wants a cat. The entrance application is for a cat joining the program."
      />
      <AdoptableCatsManager cats={catRows} locations={locationRows} />
    </div>
  );
}
