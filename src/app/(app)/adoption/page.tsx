import { redirect } from "next/navigation";
import { AdoptableCatsWorkspace } from "@/components/adoption/adoptable-cats-workspace";
import { PageHeader } from "@/components/layout/page-header";
import { getAppProfile } from "@/lib/auth";
import { getPlatformBranding } from "@/lib/branding-server";
import { canAccessAdoptions } from "@/lib/permissions";
import { createServiceClient } from "@/lib/supabase/server";
import {
  emptyAdoptionAnswers,
  type AdoptionApplicationLink,
} from "@/lib/adoption/application";
import type { AdoptionEntranceApplication } from "@/lib/adoption/entrance";
import type { AdoptableCat } from "@/lib/adoption/constants";

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
  const [{ data: cats }, branding, applicationsResult, adoptionApplicationsResult] = await Promise.all([
    service
      .from("adoptable_cats")
      .select("*")
      .order("name"),
    getPlatformBranding(),
    service
      .from("adoption_entrance_applications")
      .select("*")
      .order("created_at", { ascending: false }),
    service
      .from("adoption_applications")
      .select(
        "id, status, cat_id, cat_interest_name, applicant_first_name, applicant_last_name, applicant_email, applicant_phone, answers, created_at, cat:adoptable_cats(id, name)"
      )
      .order("created_at", { ascending: false }),
  ]);

  const catRows = (cats ?? []) as AdoptableCat[];
  const applications = (applicationsResult.data ?? []) as AdoptionEntranceApplication[];
  const adoptionApplications: AdoptionApplicationLink[] = (adoptionApplicationsResult.data ?? []).map(
    (row) => {
      const related = Array.isArray(row.cat) ? row.cat[0] : row.cat;
      const answers =
        row.answers && typeof row.answers === "object"
          ? (row.answers as AdoptionApplicationLink["answers"])
          : emptyAdoptionAnswers();
      return {
        id: row.id,
        status: row.status,
        cat_id: row.cat_id,
        cat_interest_name: row.cat_interest_name,
        applicant_first_name: row.applicant_first_name,
        applicant_last_name: row.applicant_last_name,
        applicant_email: row.applicant_email,
        applicant_phone: row.applicant_phone,
        created_at: row.created_at,
        answers,
        cat: related ? { id: related.id, name: related.name } : null,
      };
    }
  );

  return (
    <div className="space-y-6">
      <PageHeader
        title="Adoptable Cats"
        description="Cats in the program come from the rescue application. The adoption application is for a person who wants a cat."
      />
      <AdoptableCatsWorkspace
        cats={catRows}
        applications={applications}
        adoptionApplications={adoptionApplications}
        initialSection={initialSection}
        aboutMessage={branding.adoption_entrance_about_message}
        buttonText={branding.adoption_entrance_button_text}
        buttonUrl={branding.adoption_entrance_button_url}
      />
    </div>
  );
}
