import type { SupabaseClient } from "@supabase/supabase-js";
import { todayIsoDate } from "@/lib/appointments/clinic-result";
import type { ClinicResultAppointment } from "@/components/appointments/log-clinic-result-dialog";
import { trackedCatDetailsFromCat } from "@/lib/cases/tracked-cat-form";
import { fosterFormFromCat } from "@/lib/cases/tracked-cat-foster";
import type { Cat } from "@/lib/types";

type PendingClinicResultRow = {
  id: string;
  date: string;
  clinic_name: string;
  help_request_id: string | null;
  cat_id: string | null;
  cat_name: string | null;
  cat_colors: string | null;
  cat_gender: string | null;
  help_requests: { case_number: string | null } | { case_number: string | null }[] | null;
  cats:
    | Pick<
        Cat,
        | "name"
        | "gender"
        | "female_reproductive_status"
        | "colors"
        | "microchip_id"
        | "medical_notes"
        | "age_category"
        | "went_to_foster_facility"
        | "foster_facility"
        | "foster_facility_other"
        | "return_status"
        | "foster_program"
      >
    | Pick<
        Cat,
        | "name"
        | "gender"
        | "female_reproductive_status"
        | "colors"
        | "microchip_id"
        | "medical_notes"
        | "age_category"
        | "went_to_foster_facility"
        | "foster_facility"
        | "foster_facility_other"
        | "return_status"
        | "foster_program"
      >[]
    | null;
};

function linkedCatFromRow(row: PendingClinicResultRow): Cat | null {
  if (!row.cats) return null;
  const cat = Array.isArray(row.cats) ? row.cats[0] : row.cats;
  if (!cat) return null;
  return {
    id: row.cat_id ?? "",
    help_request_id: row.help_request_id ?? "",
    name: cat.name,
    gender: cat.gender,
    female_reproductive_status: cat.female_reproductive_status,
    colors: cat.colors,
    microchip_id: cat.microchip_id,
    medical_notes: cat.medical_notes,
    age_category: cat.age_category,
    went_to_foster_facility: cat.went_to_foster_facility,
    foster_facility: cat.foster_facility,
    foster_facility_other: cat.foster_facility_other,
    return_status: cat.return_status,
    foster_program: cat.foster_program,
  } as Cat;
}

export async function fetchPendingClinicResults(
  supabase: SupabaseClient,
  userEmail: string
): Promise<ClinicResultAppointment[]> {
  const today = todayIsoDate();

  const { data } = await supabase
    .from("appointments")
    .select(
      "id, date, clinic_name, help_request_id, cat_id, cat_name, cat_colors, cat_gender, help_requests(case_number), cats(name, gender, female_reproductive_status, colors, microchip_id, medical_notes, age_category, went_to_foster_facility, foster_facility, foster_facility_other, return_status, foster_program)"
    )
    .eq("reserved_by", userEmail)
    .in("status", ["reserved", "confirmed_transport"])
    .is("clinic_result_logged_at", null)
    .lt("date", today)
    .order("date", { ascending: true });

  return ((data ?? []) as PendingClinicResultRow[]).map((row) => {
    const helpRequest = Array.isArray(row.help_requests)
      ? row.help_requests[0]
      : row.help_requests;
    const linkedCat = linkedCatFromRow(row);

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
      defaultDetails: linkedCat ? trackedCatDetailsFromCat(linkedCat) : undefined,
      defaultAgeCategory: linkedCat?.age_category ?? undefined,
      defaultFoster: linkedCat ? fosterFormFromCat(linkedCat) : undefined,
    };
  });
}
