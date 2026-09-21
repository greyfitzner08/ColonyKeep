import { createClient } from "@/lib/supabase/server";
import { ClinicEventsManager } from "@/components/clinics/clinic-events-manager";
import { PageHeader } from "@/components/layout/page-header";
import type { PublicClinicEvent, Clinic, PublicBooking } from "@/lib/types";

export default async function ClinicEventsPage() {
  const supabase = await createClient();

  const [{ data: events }, { data: clinics }, { data: bookings }] = await Promise.all([
    supabase.from("public_clinic_events").select("*").order("date", { ascending: false }),
    supabase
      .from("clinics")
      .select("id, name, service_catalog, included_services, addon_services")
      .eq("is_active", true),
    supabase.from("public_bookings").select("*"),
  ]);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Public Clinic Events"
        description="Manage public-facing TNVR clinic events and bookings"
      />
      <ClinicEventsManager
        events={(events ?? []) as PublicClinicEvent[]}
        clinics={
          (clinics ?? []) as Pick<
            Clinic,
            "id" | "name" | "service_catalog" | "included_services" | "addon_services"
          >[]
        }
        bookings={(bookings ?? []) as PublicBooking[]}
      />
    </div>
  );
}
