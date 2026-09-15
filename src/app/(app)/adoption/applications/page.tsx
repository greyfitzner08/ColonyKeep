import Link from "next/link";
import { redirect } from "next/navigation";
import { ClipboardList, ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getAppProfile } from "@/lib/auth";
import { canAccessAdoptions } from "@/lib/permissions";
import { createServiceClient } from "@/lib/supabase/server";
import { AdoptionApplicationsSeenTracker } from "@/components/layout/adoption-applications-seen-tracker";
import { AdoptionApplicationsManager } from "@/components/adoption/adoption-applications-manager";
import type { AdoptionApplication } from "@/lib/adoption/application";

export default async function AdoptionApplicationsPage() {
  const profile = await getAppProfile();
  if (!profile || !canAccessAdoptions(profile)) redirect("/");

  const service = await createServiceClient();
  const { data } = await service
    .from("adoption_applications")
    .select("*, cat:adoptable_cats(id, name, profile_photo_url)")
    .order("created_at", { ascending: false });

  const applications = (data ?? []) as AdoptionApplication[];

  return (
    <div className="space-y-6">
      <AdoptionApplicationsSeenTracker profileId={profile.id} />
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold">Adoption Applications</h1>
          <p className="text-muted-foreground">
            Review public adoption applications, update status, and keep staff notes.
          </p>
        </div>
        <div className="flex gap-2">
          <Button type="button" variant="outline" asChild>
            <Link href="/adoption">
              <ClipboardList className="mr-2 h-4 w-4" />
              Adoptable cats
            </Link>
          </Button>
          <Button type="button" variant="outline" asChild>
            <Link href="/adopt" target="_blank">
              <ExternalLink className="mr-2 h-4 w-4" />
              Public form
            </Link>
          </Button>
        </div>
      </div>
      <AdoptionApplicationsManager applications={applications} />
    </div>
  );
}
