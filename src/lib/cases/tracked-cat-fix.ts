import { summarizeCatCounts } from "@/lib/cases/cat-counts";
import { fosterFieldsFromCat } from "@/lib/cases/tracked-cat-foster";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Cat } from "@/lib/types";

function trackedCatAgeCategory(cat: Pick<Cat, "age_category">): "adult" | "kitten" | null {
  return cat.age_category === "adult" || cat.age_category === "kitten" ? cat.age_category : null;
}

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

export function parseTrackedCatGender(
  gender: string | null | undefined
): "male" | "female" | null {
  const value = gender?.trim().toLowerCase() ?? "";
  if (value === "female" || value.startsWith("f")) return "female";
  if (value === "male" || value.startsWith("m")) return "male";
  return null;
}

function calendarDayFromTimestamp(value: string | null | undefined): string | null {
  if (!value) return null;
  const trimmed = value.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
  const match = /^(\d{4}-\d{2}-\d{2})/.exec(trimmed);
  return match?.[1] ?? null;
}

/** Prefer the cat’s known clinic/trap day; never invent “today” on re-sync. */
function fixDateFromCat(
  cat: Pick<Cat, "return_date" | "trap_date" | "created_at">
): string | null {
  return (
    calendarDayFromTimestamp(cat.return_date) ??
    calendarDayFromTimestamp(cat.trap_date) ??
    calendarDayFromTimestamp(cat.created_at)
  );
}

export async function updateHelpRequestCatCounts(
  service: SupabaseClient,
  helpRequestId: string
) {
  const { data: helpRequest, error: fetchError } = await service
    .from("help_requests")
    .select(
      "id, reported_cats_over_8_weeks, reported_kittens_under_8_weeks, cats_over_8_weeks, kittens_under_8_weeks, outcome_tnvr_count, outcome_acc_count, outcome_foster_count, outcome_other_count"
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
    counts.unfixedAdults + counts.fixedAdults + Math.max(0, counts.outcomeAcc);
  const reportedKittensValue =
    helpRequest.reported_kittens_under_8_weeks ??
    counts.unfixedKittens + counts.fixedKittens;

  const outcomeTnvr = Math.max(counts.fixedTotal, helpRequest.outcome_tnvr_count ?? 0);

  const { error: updateError } = await service
    .from("help_requests")
    .update({
      reported_cats_over_8_weeks: reportedAdultsValue,
      reported_kittens_under_8_weeks: reportedKittensValue,
      cats_over_8_weeks: counts.unfixedAdults,
      kittens_under_8_weeks: counts.unfixedKittens,
      cats_remaining: counts.unfixedTotal,
      outcome_tnvr_count: outcomeTnvr,
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
    .select("id, cat_id, appointment_id, logged_by, fix_date")
    .eq("help_request_id", helpRequestId);

  if (fixesError) {
    throw new Error(fixesError.message);
  }

  type SyncFixRow = {
    id: string;
    cat_id: string | null;
    appointment_id: string | null;
    logged_by: string | null;
    fix_date: string | null;
  };
  const fixRows = (fixes ?? []) as SyncFixRow[];

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
        const existing = existingByCat ?? existingByAppointment;
        const fixId = existing?.id;
        if (
          fixed &&
          fixId &&
          existing &&
          existing.logged_by === TRACKED_CAT_SYNC_ACTOR
        ) {
          const explicitDate =
            calendarDayFromTimestamp(cat.return_date) ??
            calendarDayFromTimestamp(cat.trap_date);
          const { error } = await service
            .from("clinic_fixes")
            .update({
              age_category: trackedCatAgeCategory(cat),
              gender: parseTrackedCatGender(cat.gender),
              clinic_name: cat.clinic_name,
              // Never rewrite an existing day to "today" when the cat has no date.
              ...(explicitDate ? { fix_date: explicitDate } : {}),
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
          age_category: trackedCatAgeCategory(cat),
          gender: parseTrackedCatGender(cat.gender),
          clinic_name: cat.clinic_name,
          fix_date:
            fixDateFromCat(cat) ?? new Date().toISOString().split("T")[0],
          logged_by: TRACKED_CAT_SYNC_ACTOR,
          notes: null,
          ...fosterFieldsFromCat(cat),
        })
        .select("id, cat_id, appointment_id, logged_by, fix_date")
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
