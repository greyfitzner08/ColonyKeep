import { createClient } from "@/lib/supabase/server";
import { AppointmentsCalendar } from "@/components/appointments/appointments-calendar";
import type { Appointment, Clinic } from "@/lib/types";

export default async function AppointmentsPage() {
  const supabase = await createClient();

  const [{ data: appointments }, { data: clinics }, { data: helpRequests }] =
    await Promise.all([
      supabase.from("appointments").select("*").order("date"),
      supabase.from("clinics").select("*").eq("is_active", true),
      supabase.from("help_requests").select("id, case_number, contact_name").not("status", "in", '("completed","closed")'),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Appointments</h1>
        <p className="text-muted-foreground">Clinic appointment calendar</p>
      </div>
      <AppointmentsCalendar
        appointments={(appointments ?? []) as Appointment[]}
        clinics={(clinics ?? []) as Clinic[]}
        helpRequests={helpRequests ?? []}
      />
    </div>
  );
}
