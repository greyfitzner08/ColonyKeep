import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { ClinicsManager } from "@/components/clinics/clinics-manager";
import { PageHeader } from "@/components/layout/page-header";
import { canManageClinics } from "@/lib/permissions";
import type { Clinic } from "@/lib/types";

export default async function ClinicsPage() {
  const supabase = await createClient();
  const profile = await getAppProfile();
  const canManage = canManageClinics(profile);
  const { data: clinics } = await supabase.from("clinics").select("*").order("name");

  return (
    <div className="space-y-6">
      <PageHeader
        title="Clinics"
        description={
          canManage
            ? "Manage clinics, packages, and services"
            : "Partner clinic hours, packages, and visit details"
        }
      />
      <ClinicsManager clinics={(clinics ?? []) as Clinic[]} canManage={canManage} />
    </div>
  );
}
