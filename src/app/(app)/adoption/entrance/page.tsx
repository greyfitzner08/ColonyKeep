import Link from "next/link";
import { redirect } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { Button } from "@/components/ui/button";
import { EntranceReviewManager } from "@/components/adoption/entrance-review-manager";
import { PageHeader } from "@/components/layout/page-header";
import { getAppProfile } from "@/lib/auth";
import { canAccessAdoptions } from "@/lib/permissions";
import { createServiceClient } from "@/lib/supabase/server";
import type { AdoptionEntranceApplication } from "@/lib/adoption/entrance";

export default async function AdoptionEntranceReviewPage() {
  const profile = await getAppProfile();
  if (!profile || !canAccessAdoptions(profile)) redirect("/");

  const service = await createServiceClient();
  const { data } = await service
    .from("adoption_entrance_applications")
    .select("*")
    .order("created_at", { ascending: false });

  const applications = (data ?? []) as AdoptionEntranceApplication[];
  const pending = applications.filter((application) => application.status === "pending").length;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Entrance applications"
        description={
          pending > 0
            ? `${pending} ${pending === 1 ? "cat is" : "cats are"} waiting for an adoption specialist to approve or decline.`
            : "Approve or decline cats submitted for the adoption program."
        }
        actions={
          <>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/adoption">Adoptable cats</Link>
            </Button>
            <Button type="button" size="sm" variant="outline" asChild>
              <Link href="/adoption-entrance" target="_blank">
                <ExternalLink className="mr-1.5 h-4 w-4" />
                Public form
              </Link>
            </Button>
          </>
        }
      />
      <EntranceReviewManager applications={applications} />
    </div>
  );
}
