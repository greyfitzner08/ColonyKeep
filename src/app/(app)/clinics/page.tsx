import { createClient } from "@/lib/supabase/server";
import { ClinicsManager } from "@/components/clinics/clinics-manager";
import type { Clinic } from "@/lib/types";

export default async function ClinicsPage() {
  const supabase = await createClient();
  const { data: clinics } = await supabase.from("clinics").select("*").order("name");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Clinics</h1>
        <p className="text-muted-foreground">Manage vet clinic partners and services</p>
      </div>
      <ClinicsManager clinics={(clinics ?? []) as Clinic[]} />
    </div>
  );
}
