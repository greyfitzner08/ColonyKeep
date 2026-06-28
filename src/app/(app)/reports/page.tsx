import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";
import type {
  ReportAppointment,
  ReportCat,
  ReportClinic,
  ReportClinicFix,
  ReportHelpRequest,
  ReportTrapTeam,
} from "@/lib/reports/aggregations";

const HELP_REQUEST_REPORT_FIELDS =
  "id, case_number, status, contact_name, contact_email, colony_city, colony_county, colony_zip, kittens_under_8_weeks, cats_over_8_weeks, assigned_team_id, assigned_team_name, claimed_by_email, claimed_by_name, trapper_trap_loaner, created_at";

export default async function ReportsPage() {
  const profile = await getAppProfile();
  if (profile?.role !== "admin") redirect("/");

  const supabase = await createClient();

  const [
    { data: helpRequests },
    { data: cats },
    { data: clinicFixes },
    { data: appointments },
    { data: teams },
    { data: clinics },
    { data: newsletterSignups },
  ] = await Promise.all([
    supabase.from("help_requests").select(HELP_REQUEST_REPORT_FIELDS).order("created_at", {
      ascending: false,
    }),
    supabase
      .from("cats")
      .select(
        "id, help_request_id, clinic_id, clinic_name, trap_date, created_at, age_category, went_to_foster_facility, foster_facility, foster_facility_other"
      ),
    supabase
      .from("clinic_fixes")
      .select(
        "id, help_request_id, cat_id, fix_date, clinic_name, age_category, went_to_foster_facility, foster_facility, foster_facility_other"
      ),
    supabase
      .from("appointments")
      .select("id, clinic_id, clinic_name, date, status, help_request_id"),
    supabase.from("trap_teams").select("id, name, zip_codes, is_active"),
    supabase.from("clinics").select("id, name, is_active"),
    supabase
      .from("help_requests")
      .select("id, case_number, contact_name, contact_email, created_at, newsletter_list_added_at")
      .eq("consent_communications", true)
      .not("contact_email", "is", null)
      .neq("contact_email", "")
      .order("created_at", { ascending: false }),
  ]);

  return (
    <ReportsDashboard
      helpRequests={(helpRequests ?? []) as ReportHelpRequest[]}
      cats={(cats ?? []) as ReportCat[]}
      clinicFixes={(clinicFixes ?? []) as ReportClinicFix[]}
      appointments={(appointments ?? []) as ReportAppointment[]}
      teams={(teams ?? []) as ReportTrapTeam[]}
      clinics={(clinics ?? []) as ReportClinic[]}
      newsletterSignups={newsletterSignups ?? []}
    />
  );
}
