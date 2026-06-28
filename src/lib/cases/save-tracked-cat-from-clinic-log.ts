import { resolveFemaleReproductiveStatusForSave } from "@/lib/cases/female-reproductive-status";
import { trackedCatDetailsPayload, type TrackedCatDetails } from "@/lib/cases/tracked-cat-form";
import { trackedCatReturnFields } from "@/lib/cases/tracked-cat-foster";
import { syncTrackedCatFixesForCase } from "@/lib/cases/tracked-cat-fix";
import type { FosterFacility } from "@/lib/cases/foster-facility";
import type { SupabaseClient } from "@supabase/supabase-js";

interface SaveTrackedCatFromClinicLogInput {
  helpRequestId: string;
  catId?: string | null;
  appointmentId?: string | null;
  clinicName?: string | null;
  details: TrackedCatDetails;
  ageCategory: "adult" | "kitten";
  wentToFosterFacility: boolean;
  fosterFacility?: FosterFacility | null;
  fosterFacilityOther?: string | null;
}

export async function saveTrackedCatFromClinicLog(
  service: SupabaseClient,
  input: SaveTrackedCatFromClinicLogInput
): Promise<string | null> {
  const identity = trackedCatDetailsPayload(input.details);
  const returnFields = trackedCatReturnFields({
    wentToFosterFacility: input.wentToFosterFacility,
    fosterFacility: input.fosterFacility ?? null,
    fosterFacilityOther: input.fosterFacilityOther ?? null,
  });

  const catPayload = {
    ...identity,
    female_reproductive_status: resolveFemaleReproductiveStatusForSave(
      input.details.gender,
      input.details.femaleReproductiveStatus
    ),
    age_category: input.ageCategory,
    trapped_status: "Trapped",
    appointment_status: "Complete",
    clinic_name: input.clinicName?.trim() || null,
    ...returnFields,
  };

  if (input.catId) {
    const { error } = await service.from("cats").update(catPayload).eq("id", input.catId);
    if (error) throw new Error(error.message);
    await syncTrackedCatFixesForCase(service, input.helpRequestId);
    return input.catId;
  }

  const { data: created, error: insertError } = await service
    .from("cats")
    .insert({
      help_request_id: input.helpRequestId,
      appointment_id: input.appointmentId ?? null,
      ...catPayload,
    })
    .select("id")
    .single();

  if (insertError || !created) {
    throw new Error(insertError?.message ?? "Unable to save tracked cat");
  }

  await syncTrackedCatFixesForCase(service, input.helpRequestId);
  return created.id as string;
}
