import { formatClinicResultSummary } from "@/lib/appointments/clinic-result";
import {
  formatFosterFacilitySummary,
  normalizeFosterFacilityInput,
  validateFosterFacilityInput,
  type FosterFacility,
} from "@/lib/cases/foster-facility";
import { isAutoSyncedClinicFix } from "@/lib/cases/tracked-cat-fix";
import { updateHelpRequestCatCounts } from "@/lib/cases/tracked-cat-fix";
import { normalizeHistoryLog } from "@/lib/cases/history-log";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { HistoryEntry } from "@/lib/types";

export interface RecordClinicFixInput {
  helpRequestId: string;
  appointmentId?: string | null;
  catId?: string | null;
  ageCategory?: "adult" | "kitten" | null;
  gender?: "male" | "female" | null;
  clinicName?: string | null;
  fixDate?: string;
  notes?: string | null;
  wentToFosterFacility: boolean;
  fosterFacility?: FosterFacility | null;
  fosterFacilityOther?: string | null;
  actorEmail: string;
  actorName: string;
}

export async function recordClinicFix(
  service: SupabaseClient,
  input: RecordClinicFixInput
): Promise<{ summary: string; fixId: string }> {
  const { data: helpRequest, error: fetchError } = await service
    .from("help_requests")
    .select(
      "id, reported_cats_over_8_weeks, reported_kittens_under_8_weeks, cats_over_8_weeks, kittens_under_8_weeks, outcome_tnvr_count, history_log, case_number"
    )
    .eq("id", input.helpRequestId)
    .single();

  if (fetchError || !helpRequest) {
    throw new Error(fetchError?.message ?? "Case not found");
  }

  if (input.appointmentId) {
    const { data: existingFix } = await service
      .from("clinic_fixes")
      .select("id, logged_by")
      .eq("appointment_id", input.appointmentId)
      .maybeSingle();

    if (existingFix && !isAutoSyncedClinicFix(existingFix)) {
      throw new Error("Clinic results already logged for this appointment");
    }
  } else if (input.catId) {
    const { data: existingFix } = await service
      .from("clinic_fixes")
      .select("id, logged_by")
      .eq("cat_id", input.catId)
      .maybeSingle();

    if (existingFix && !isAutoSyncedClinicFix(existingFix)) {
      throw new Error("Clinic fix already logged for this cat");
    }
  }

  const fosterError = validateFosterFacilityInput({
    wentToFosterFacility: input.wentToFosterFacility,
    fosterFacility: input.fosterFacility,
    fosterFacilityOther: input.fosterFacilityOther,
  });
  if (fosterError) {
    throw new Error(fosterError);
  }

  const fosterFields = normalizeFosterFacilityInput({
    wentToFosterFacility: input.wentToFosterFacility,
    fosterFacility: input.fosterFacility,
    fosterFacilityOther: input.fosterFacilityOther,
  });

  const fixDate = input.fixDate ?? new Date().toISOString().split("T")[0];
  const summary = formatClinicResultSummary({
    ageCategory: input.ageCategory ?? null,
    gender: input.gender ?? null,
  });

  const fixPayload: Record<string, unknown> = {
    help_request_id: input.helpRequestId,
    appointment_id: input.appointmentId ?? null,
    cat_id: input.catId ?? null,
    age_category: input.ageCategory ?? null,
    gender: input.gender ?? null,
    clinic_name: input.clinicName ?? null,
    fix_date: fixDate,
    logged_by: input.actorEmail,
    logged_by_name: input.actorName,
    notes: input.notes ?? null,
    ...fosterFields,
  };

  let fixId: string;

  if (input.appointmentId) {
    const { data: existingFix } = await service
      .from("clinic_fixes")
      .select("id, logged_by")
      .eq("appointment_id", input.appointmentId)
      .maybeSingle();

    if (existingFix && isAutoSyncedClinicFix(existingFix)) {
      const { data: updated, error: updateError } = await service
        .from("clinic_fixes")
        .update(fixPayload)
        .eq("id", existingFix.id)
        .select("id")
        .single();

      if (updateError || !updated) {
        throw new Error(updateError?.message ?? "Unable to record clinic fix");
      }
      fixId = updated.id as string;
    } else {
      const { data: fix, error: insertError } = await service
        .from("clinic_fixes")
        .insert(fixPayload)
        .select("id")
        .single();

      if (insertError || !fix) {
        throw new Error(insertError?.message ?? "Unable to record clinic fix");
      }
      fixId = fix.id as string;
    }
  } else if (input.catId) {
    const { data: existingFix } = await service
      .from("clinic_fixes")
      .select("id, logged_by")
      .eq("cat_id", input.catId)
      .maybeSingle();

    if (existingFix && isAutoSyncedClinicFix(existingFix)) {
      const { data: updated, error: updateError } = await service
        .from("clinic_fixes")
        .update(fixPayload)
        .eq("id", existingFix.id)
        .select("id")
        .single();

      if (updateError || !updated) {
        throw new Error(updateError?.message ?? "Unable to record clinic fix");
      }
      fixId = updated.id as string;
    } else {
      const { data: fix, error: insertError } = await service
        .from("clinic_fixes")
        .insert(fixPayload)
        .select("id")
        .single();

      if (insertError || !fix) {
        throw new Error(insertError?.message ?? "Unable to record clinic fix");
      }
      fixId = fix.id as string;
    }
  } else {
    const { data: fix, error: insertError } = await service
      .from("clinic_fixes")
      .insert(fixPayload)
      .select("id")
      .single();

    if (insertError || !fix) {
      throw new Error(insertError?.message ?? "Unable to record clinic fix");
    }
    fixId = fix.id as string;
  }

  const clinicLabel = input.clinicName ? ` (${input.clinicName}, ${fixDate})` : ` (${fixDate})`;
  const fosterSummary = formatFosterFacilitySummary(
    fosterFields.went_to_foster_facility,
    fosterFields.foster_facility as FosterFacility | null,
    fosterFields.foster_facility_other
  );

  const historyEntry: HistoryEntry = {
    timestamp: new Date().toISOString(),
    action: "clinic_result",
    actor_email: input.actorEmail,
    actor_name: input.actorName,
    details: `${summary}${clinicLabel} · ${fosterSummary}${input.notes ? ` — ${input.notes}` : ""}`,
    highlighted: true,
    text_color: "green",
  };

  const historyLog = [...normalizeHistoryLog(helpRequest.history_log), historyEntry];

  const { error: updateError } = await service
    .from("help_requests")
    .update({
      history_log: historyLog,
    })
    .eq("id", input.helpRequestId);

  if (updateError) {
    throw new Error(updateError.message);
  }

  await updateHelpRequestCatCounts(service, input.helpRequestId);

  return { summary, fixId };
}
