import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { getAppProfile } from "@/lib/auth";
import { ReportsDashboard } from "@/components/reports/reports-dashboard";
import { petStoreDisplayName, type EntranceAnswers } from "@/lib/adoption/entrance";
import type { AdoptableCatStatus } from "@/lib/adoption/constants";
import type { AdoptionApplicationStatus } from "@/lib/adoption/application";
import type {
  ReportAdoptableCat,
  ReportAdoptionApplication,
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
    { data: adoptableCatRows },
    { data: adoptionApplicationRows },
    { data: entranceRows },
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
    supabase.from("adoptable_cats").select("id, name, sex, status, created_at").order("created_at", {
      ascending: false,
    }),
    supabase
      .from("adoption_applications")
      .select(
        "id, status, cat_interest_name, applicant_first_name, applicant_last_name, applicant_email, created_at, cat:adoptable_cats(name)"
      )
      .order("created_at", { ascending: false }),
    supabase
      .from("adoption_entrance_applications")
      .select("adoptable_cat_id, answers, updated_at")
      .not("adoptable_cat_id", "is", null)
      .order("updated_at", { ascending: false }),
  ]);

  const locationByCat = new Map<string, { fosterName: string; petStore: string }>();
  for (const row of entranceRows ?? []) {
    const catId = row.adoptable_cat_id;
    if (!catId || locationByCat.has(catId)) continue;
    const answers =
      row.answers && typeof row.answers === "object" ? (row.answers as EntranceAnswers) : undefined;
    locationByCat.set(catId, {
      fosterName: answers?.foster_name?.trim() || "",
      petStore: petStoreDisplayName(answers),
    });
  }

  const adoptableCats: ReportAdoptableCat[] = (adoptableCatRows ?? []).map((cat) => {
    const location = locationByCat.get(cat.id);
    return {
      id: cat.id,
      name: cat.name,
      sex: cat.sex,
      status: cat.status as AdoptableCatStatus,
      created_at: cat.created_at,
      fosterName: location?.fosterName ?? "",
      petStore: location?.petStore ?? "",
    };
  });

  const adoptionApplications: ReportAdoptionApplication[] = (adoptionApplicationRows ?? []).map((application) => {
    const related = Array.isArray(application.cat) ? application.cat[0] : application.cat;
    const linkedCatName =
      related && typeof related === "object" && "name" in related && typeof related.name === "string"
        ? related.name
        : "";
    return {
      id: application.id,
      status: application.status as AdoptionApplicationStatus,
      applicantName: `${application.applicant_first_name} ${application.applicant_last_name}`.trim(),
      applicantEmail: application.applicant_email ?? "",
      catInterestName: application.cat_interest_name ?? "",
      linkedCatName,
      created_at: application.created_at,
    };
  });

  return (
    <ReportsDashboard
      helpRequests={(helpRequests ?? []) as ReportHelpRequest[]}
      cats={(cats ?? []) as ReportCat[]}
      clinicFixes={(clinicFixes ?? []) as ReportClinicFix[]}
      appointments={(appointments ?? []) as ReportAppointment[]}
      teams={(teams ?? []) as ReportTrapTeam[]}
      clinics={(clinics ?? []) as ReportClinic[]}
      adoptableCats={adoptableCats}
      adoptionApplications={adoptionApplications}
    />
  );
}
