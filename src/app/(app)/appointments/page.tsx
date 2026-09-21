import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { AppointmentsCalendar } from "@/components/appointments/appointments-calendar";
import { PageHeader } from "@/components/layout/page-header";
import { localDateKey } from "@/lib/appointments/slot-date";
import type { Appointment, Clinic, Cat } from "@/lib/types";

interface AppointmentsPageProps {
  searchParams: Promise<{ caseId?: string }>;
}

export default async function AppointmentsPage({ searchParams }: AppointmentsPageProps) {
  const params = await searchParams;
  const supabase = await createClient();
  const profile = await getAppProfile();
  const isAdmin = profile?.role === "admin";
  const canAddAppointments = isAdmin;
  const todayKey = localDateKey();

  let appointmentsQuery = supabase.from("appointments").select("*").order("date");
  // TNVR team only sees today and future slots; admins keep full history.
  if (!isAdmin) {
    appointmentsQuery = appointmentsQuery.gte("date", todayKey);
  }

  const [
    { data: appointments },
    { data: clinics },
    { data: helpRequests },
    linkedCaseResult,
    catsResult,
  ] = await Promise.all([
    appointmentsQuery,
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
      <PageHeader title="Appointments" description="Clinic appointment calendar" />
      <AppointmentsCalendar
        appointments={(appointments ?? []) as Appointment[]}
        clinics={(clinics ?? []) as Clinic[]}
        helpRequests={helpRequests ?? []}
        linkedHelpRequest={linkedHelpRequest}
        linkedCats={(linkedCats ?? []) as Cat[]}
        canAddAppointments={canAddAppointments}
      />
    </div>
  );
}
