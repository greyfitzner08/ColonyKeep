import { summarizeCatCounts } from "@/lib/cases/cat-counts";
import { fosterFieldsFromCat } from "@/lib/cases/tracked-cat-foster";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Cat } from "@/lib/types";

export const TRACKED_CAT_SYNC_ACTOR = "tracked-cat-sync";
export const TRACKED_CAT_SYNC_NOTE = "Synced from tracked cat status";

export function isAutoSyncedClinicFix(
  fix: Pick<{ logged_by: string | null }, "logged_by">
): boolean {
  return fix.logged_by === TRACKED_CAT_SYNC_ACTOR;
}

export function clinicFixNotesForDisplay(
  fix: Pick<{ logged_by: string | null; notes: string | null }, "logged_by" | "notes">
): string | null {
  if (!fix.notes?.trim()) return null;
  if (isAutoSyncedClinicFix(fix) && fix.notes.trim() === TRACKED_CAT_SYNC_NOTE) {
    return null;
  }
  return fix.notes;
}

export function clinicFixLoggedByForDisplay(
  fix: Pick<{ logged_by: string | null; logged_by_name: string | null }, "logged_by" | "logged_by_name">
): string | null {
  if (isAutoSyncedClinicFix(fix)) return null;
  return fix.logged_by_name;
}

const FIXED_APPOINTMENT_STATUSES = new Set(["complete", "completed"]);
const FIXED_TRAPPED_STATUSES = new Set(["fixed", "trapped"]);

export function isTrackedCatClinicFixed(
  cat: Pick<Cat, "trapped_status" | "appointment_status">
): boolean {
  const trapped = cat.trapped_status?.trim().toLowerCase() ?? "";
  const appointment = cat.appointment_status?.trim().toLowerCase() ?? "";
  return FIXED_APPOINTMENT_STATUSES.has(appointment) || FIXED_TRAPPED_STATUSES.has(trapped);
}

export function parseTrackedCatGender(gender: string | null | undefined): "male" | "female" {
  const value = gender?.trim().toLowerCase() ?? "";
  if (value.startsWith("f") || value === "female") return "female";
  return "male";
}

function fixDateFromCat(cat: Pick<Cat, "return_date" | "trap_date">) {
  return cat.return_date ?? cat.trap_date ?? new Date().toISOString().split("T")[0];
}

export async function updateHelpRequestCatCounts(
  service: SupabaseClient,
  helpRequestId: string
) {
  const { data: helpRequest, error: fetchError } = await service
    .from("help_requests")
    .select(
      "id, reported_cats_over_8_weeks, reported_kittens_under_8_weeks, cats_over_8_weeks, kittens_under_8_weeks"
    )
    .eq("id", helpRequestId)
    .single();

  if (fetchError || !helpRequest) {
    throw new Error(fetchError?.message ?? "Case not found");
  }

  const { data: fixes, error: fixesError } = await service
    .from("clinic_fixes")
    .select("age_category, went_to_foster_facility, cat_id")
    .eq("help_request_id", helpRequestId);

  if (fixesError) {
    throw new Error(fixesError.message);
  }

  const { data: cats, error: catsError } = await service
    .from("cats")
    .select("id, age_category, went_to_foster_facility")
    .eq("help_request_id", helpRequestId);

  if (catsError) {
    throw new Error(catsError.message);
  }

  const counts = summarizeCatCounts(helpRequest, fixes ?? [], cats ?? []);
  const reportedAdultsValue =
    helpRequest.reported_cats_over_8_weeks ??
    counts.unfixedAdults + counts.fixedAdults;
  const reportedKittensValue =
    helpRequest.reported_kittens_under_8_weeks ??
    counts.unfixedKittens + counts.fixedKittens;

  const { error: updateError } = await service
    .from("help_requests")
    .update({
      reported_cats_over_8_weeks: reportedAdultsValue,
      reported_kittens_under_8_weeks: reportedKittensValue,
      cats_over_8_weeks: counts.unfixedAdults,
      kittens_under_8_weeks: counts.unfixedKittens,
      cats_remaining: counts.unfixedTotal,
      outcome_tnvr_count: counts.fixedTotal,
    })
    .eq("id", helpRequestId);

  if (updateError) {
    throw new Error(updateError.message);
  }
}

export async function syncTrackedCatFixesForCase(
  service: SupabaseClient,
  helpRequestId: string
) {
  const { data: cats, error: catsError } = await service
    .from("cats")
    .select("*")
    .eq("help_request_id", helpRequestId);

  if (catsError) {
    throw new Error(catsError.message);
  }

  const { data: fixes, error: fixesError } = await service
    .from("clinic_fixes")
    .select("id, cat_id, appointment_id, logged_by")
    .eq("help_request_id", helpRequestId);

  if (fixesError) {
    throw new Error(fixesError.message);
  }

  const fixRows = fixes ?? [];

  for (const cat of (cats ?? []) as Cat[]) {
    const fixed = isTrackedCatClinicFixed(cat);
    const existingByCat = fixRows.find((fix) => fix.cat_id === cat.id);
    const existingByAppointment =
      cat.appointment_id != null
        ? fixRows.find((fix) => fix.appointment_id === cat.appointment_id)
        : null;

    if (fixed) {
      if (existingByAppointment && !existingByAppointment.cat_id) {
        const { error } = await service
          .from("clinic_fixes")
          .update({ cat_id: cat.id })
          .eq("id", existingByAppointment.id);
        if (error) throw new Error(error.message);
        existingByAppointment.cat_id = cat.id;
        continue;
      }

      if (existingByCat || existingByAppointment) {
        const fixId = existingByCat?.id ?? existingByAppointment?.id;
        if (
          fixed &&
          fixId &&
          (existingByCat?.logged_by === TRACKED_CAT_SYNC_ACTOR ||
            existingByAppointment?.logged_by === TRACKED_CAT_SYNC_ACTOR)
        ) {
          const { error } = await service
            .from("clinic_fixes")
            .update({
              age_category: cat.age_category ?? "adult",
              gender: parseTrackedCatGender(cat.gender),
              clinic_name: cat.clinic_name,
              fix_date: fixDateFromCat(cat),
              ...fosterFieldsFromCat(cat),
            })
            .eq("id", fixId);
          if (error) throw new Error(error.message);
        }
        continue;
      }

      const { data: inserted, error: insertError } = await service
        .from("clinic_fixes")
        .insert({
          help_request_id: helpRequestId,
          cat_id: cat.id,
          appointment_id: cat.appointment_id,
          age_category: cat.age_category ?? "adult",
          gender: parseTrackedCatGender(cat.gender),
          clinic_name: cat.clinic_name,
          fix_date: fixDateFromCat(cat),
          logged_by: TRACKED_CAT_SYNC_ACTOR,
          notes: null,
          ...fosterFieldsFromCat(cat),
        })
        .select("id, cat_id, appointment_id, logged_by")
        .single();

      if (insertError) {
        throw new Error(insertError.message);
      }

      if (inserted) {
        fixRows.push(inserted);
      }
      continue;
    }

    if (existingByCat?.logged_by === TRACKED_CAT_SYNC_ACTOR) {
      const { error } = await service.from("clinic_fixes").delete().eq("id", existingByCat.id);
      if (error) throw new Error(error.message);
    }
  }

  await updateHelpRequestCatCounts(service, helpRequestId);
}
