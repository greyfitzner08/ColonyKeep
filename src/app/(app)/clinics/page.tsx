import { createClient } from "@/lib/supabase/server";
import { ClinicsManager } from "@/components/clinics/clinics-manager";
import { PageHeader } from "@/components/layout/page-header";
import type { Clinic } from "@/lib/types";

export default async function ClinicsPage() {
  const supabase = await createClient();
  const { data: clinics } = await supabase.from("clinics").select("*").order("name");

  return (
    <div className="space-y-6">
      <PageHeader title="Clinics" description="Manage clinics, packages, and services" />
      <ClinicsManager clinics={(clinics ?? []) as Clinic[]} />
    </div>
  );
}
