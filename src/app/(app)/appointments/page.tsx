import { createClient } from "@/lib/supabase/server";
import { AppointmentsCalendar } from "@/components/appointments/appointments-calendar";
import type { Appointment, Clinic, Cat } from "@/lib/types";

interface AppointmentsPageProps {
  searchParams: Promise<{ caseId?: string }>;
}

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();

  const [{ data: appointments }, { data: clinics }, { data: helpRequests }, linkedCaseResult, catsResult] =
    await Promise.all([
      supabase.from("appointments").select("*").order("date"),
      supabase.from("clinics").select("*").eq("is_active", true),
      supabase
        .from("help_requests")
        .select("id, case_number, contact_name")
        .not("status", "in", '("completed","closed")'),
      params.caseId
        ? supabase
            .from("help_requests")
            .select("id, case_number, contact_name")
            .eq("id", params.caseId)
            .maybeSingle()
        : Promise.resolve({ data: null }),
      params.caseId
        ? supabase.from("cats").select("*").eq("help_request_id", params.caseId)
        : Promise.resolve({ data: [] }),
    ]);

  const linkedHelpRequest = linkedCaseResult.data ?? null;
  const linkedCats = catsResult.data ?? [];

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
        linkedHelpRequest={linkedHelpRequest}
        linkedCats={(linkedCats ?? []) as Cat[]}
      />
    </div>
  );
}
