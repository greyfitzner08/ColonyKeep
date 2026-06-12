import { createClient } from "@/lib/supabase/server";
import { ClinicEventsManager } from "@/components/clinics/clinic-events-manager";
import type { PublicClinicEvent, Clinic, PublicBooking } from "@/lib/types";

export default async function ClinicEventsPage() {
  const supabase = await createClient();

  const [{ data: events }, { data: clinics }, { data: bookings }] = await Promise.all([
    supabase.from("public_clinic_events").select("*").order("date", { ascending: false }),
    supabase.from("clinics").select("id, name").eq("is_active", true),
    supabase.from("public_bookings").select("*"),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Public Clinic Events</h1>
        <p className="text-muted-foreground">Manage public-facing TNVR clinic events and bookings</p>
      </div>
      <ClinicEventsManager
        events={(events ?? []) as PublicClinicEvent[]}
        clinics={clinics ?? []}
        bookings={(bookings ?? []) as PublicBooking[]}
      />
    </div>
  );
}
