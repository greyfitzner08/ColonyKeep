import { redirect } from "next/navigation";
import Link from "next/link";
import { getAppProfile } from "@/lib/auth";
import { canAccessAdoptions } from "@/lib/permissions";
import { createServiceClient } from "@/lib/supabase/server";
import { AdoptableCatsManager } from "@/components/adoption/adoptable-cats-manager";
import type { AdoptableCat, AdoptionLocation } from "@/lib/adoption/constants";
import { Button } from "@/components/ui/button";
import { MapPin } from "lucide-react";

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
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Adoptable Cats</h1>
          <p className="text-muted-foreground">
            Track cats in the adoption program — medical status, placement location, and notes for
            Adoption Specialists.
          </p>
        </div>
        <Button type="button" variant="outline" asChild>
          <Link href="/adoption/locations">
            <MapPin className="mr-2 h-4 w-4" />
            Manage locations
          </Link>
        </Button>
      </div>
      <AdoptableCatsManager cats={catRows} locations={locationRows} />
    </div>
  );
}
