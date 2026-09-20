import { redirect } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { getAppProfile } from "@/lib/auth";
import { canAccessAdoptions } from "@/lib/permissions";
import { createServiceClient } from "@/lib/supabase/server";
import { AdoptionLocationsManager } from "@/components/adoption/adoption-locations-manager";
import { PageHeader } from "@/components/layout/page-header";
import type { AdoptionLocation } from "@/lib/adoption/constants";
import { Button } from "@/components/ui/button";

export default async function AdoptionLocationsPage() {
  const profile = await getAppProfile();
  if (!canAccessAdoptions(profile)) redirect("/");

  const service = await createServiceClient();
  const [{ data: locations }, { data: cats }] = await Promise.all([
    service.from("adoption_locations").select("*").order("name"),
    service.from("adoptable_cats").select("id, location_id"),
  ]);

  const catCountByLocation = new Map<string, number>();
  for (const cat of cats ?? []) {
    if (!cat.location_id) continue;
    catCountByLocation.set(cat.location_id, (catCountByLocation.get(cat.location_id) ?? 0) + 1);
  }

  const rows: AdoptionLocation[] = ((locations ?? []) as AdoptionLocation[]).map((location) => ({
    ...location,
    cat_count: catCountByLocation.get(location.id) ?? 0,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adoption Locations"
        description="Pet stores and foster homes where adoptable cats are placed, with contact and address details."
        actions={
          <Button type="button" variant="outline" size="sm" asChild>
            <Link href="/adoption">
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Adoptable cats
            </Link>
          </Button>
        }
      />
      <AdoptionLocationsManager locations={rows} />
    </div>
  );
}
