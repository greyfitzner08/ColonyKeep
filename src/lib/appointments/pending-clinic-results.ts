import type { SupabaseClient } from "@supabase/supabase-js";
import { todayIsoDate } from "@/lib/appointments/clinic-result";
import type { ClinicResultAppointment } from "@/components/appointments/log-clinic-result-dialog";

export async function fetchPendingClinicResults(
  supabase: SupabaseClient,
  userEmail: string
): Promise<ClinicResultAppointment[]> {
  const today = todayIsoDate();

  const { data } = await supabase
    .from("appointments")
    .select("id, date, clinic_name, help_request_id, cat_id, cat_name, cat_colors, cat_gender, help_requests(case_number)")
    .eq("reserved_by", userEmail)
    .in("status", ["reserved", "confirmed_transport"])
    .is("clinic_result_logged_at", null)
    .lt("date", today)
    .order("date", { ascending: true });

  return (data ?? []).map((row) => {
    const helpRequest = Array.isArray(row.help_requests)
      ? row.help_requests[0]
      : row.help_requests;

    return {
      id: row.id,
      date: row.date,
      clinic_name: row.clinic_name,
      help_request_id: row.help_request_id,
      cat_id: row.cat_id,
      cat_name: row.cat_name,
      cat_colors: row.cat_colors,
      cat_gender: row.cat_gender,
      case_number: helpRequest?.case_number ?? null,
    };
  });
}
