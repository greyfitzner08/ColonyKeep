import { redirect } from "next/navigation";
import { AdoptableCatsWorkspace } from "@/components/adoption/adoptable-cats-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { getAppProfile } from "@/lib/auth";
import { getPlatformBranding } from "@/lib/branding-server";
import { canAccessAdoptions } from "@/lib/permissions";
import { createServiceClient } from "@/lib/supabase/server";
import type { AdoptionEntranceApplication } from "@/lib/adoption/entrance";
import type { AdoptableCat, AdoptionLocation } from "@/lib/adoption/constants";

export default async function AdoptionPage({
  searchParams,
}: {
  searchParams: Promise<{ section?: string }>;
}) {
  const profile = await getAppProfile();
  if (!canAccessAdoptions(profile)) redirect("/");

  const params = await searchParams;
  const initialSection =
    params.section === "rescue" || params.section === "about" ? params.section : "cats";

  const service = await createServiceClient();
  const [{ data: cats }, { data: locations }, branding, applicationsResult] = await Promise.all([
    service
      .from("adoptable_cats")
      .select("*, location:adoption_locations(*)")
      .order("name"),
    service.from("adoption_locations").select("*").order("name"),
    getPlatformBranding(),
    service
      .from("adoption_entrance_applications")
      .select("*")
      .order("created_at", { ascending: false }),
  ]);

  const locationRows = (locations ?? []) as AdoptionLocation[];
  const catRows = ((cats ?? []) as AdoptableCat[]).map((cat) => ({
    ...cat,
    location: Array.isArray(cat.location) ? cat.location[0] ?? null : cat.location ?? null,
  }));
  const applications = (applicationsResult.data ?? []) as AdoptionEntranceApplication[];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adoptable Cats"
        description="Cats in the program come from the rescue application. The adoption application is for a person who wants a cat."
      />
      <AdoptableCatsWorkspace
        cats={catRows}
        locations={locationRows}
        applications={applications}
        initialSection={initialSection}
        aboutMessage={branding.adoption_entrance_about_message}
        buttonText={branding.adoption_entrance_button_text}
        buttonUrl={branding.adoption_entrance_button_url}
      />
    </div>
  );
}
