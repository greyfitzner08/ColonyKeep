import { redirect } from "next/navigation";
import Link from "next/link";
import { getAppProfile } from "@/lib/auth";
import { canAccessAdoptions } from "@/lib/permissions";
import { createServiceClient } from "@/lib/supabase/server";
import { AdoptableCatsManager } from "@/components/adoption/adoptable-cats-manager";
import { PageHeader } from "@/components/layout/page-header";
import type { AdoptableCat, AdoptionLocation } from "@/lib/adoption/constants";
import { Button } from "@/components/ui/button";
import { ExternalLink, MapPin } from "lucide-react";

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
        description="Track cats in the adoption program — medical status, placement location, and notes for Adoption Specialists."
        actions={
          <>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/adoption/applications">Applications</Link>
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/adoption/locations">
                <MapPin className="mr-1.5 h-4 w-4" />
                Locations
              </Link>
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/adopt" target="_blank">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Public form
              </Link>
            </Button>
          </>
        }
      />
      <AdoptableCatsManager cats={catRows} locations={locationRows} />
    </div>
  );
}
