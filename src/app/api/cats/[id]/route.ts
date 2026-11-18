import { NextRequest, NextResponse } from "next/server";
import { requireCaseWorker } from "@/lib/api/auth";
import { caseClaimBlockForId } from "@/lib/cases/case-claim-block";
import { isTrackedCatClinicFixed } from "@/lib/cases/tracked-cat-fix";
import { resolveTrackedCatFosterFields } from "@/lib/cases/tracked-cat-foster";
import { syncTrackedCatFixesForCase, updateHelpRequestCatCounts } from "@/lib/cases/tracked-cat-fix";
import { createServiceClient } from "@/lib/supabase/server";
import type { FosterFacility } from "@/lib/cases/foster-facility";
import { resolveFemaleReproductiveStatusForSave } from "@/lib/cases/female-reproductive-status";
import { isCalendarIsoDate } from "@/lib/utils";

function emptyOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

function parseIsoDate(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return isCalendarIsoDate(trimmed) ? trimmed : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { profile, response } = await requireCaseWorker();
  if (response) return response;

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const trappedStatus = emptyOrNull(body?.trapped_status);
  const appointmentStatus = emptyOrNull(body?.appointment_status);
  const fixedAtClinicProvided = body?.fixedAtClinic !== undefined;
  const fixedAtClinic = body?.fixedAtClinic === true;
  const alreadyFixed = body?.alreadyFixed === true && !fixedAtClinic;
  const transferredUnfixed =
    body?.transferredUnfixed === true && !fixedAtClinic && !alreadyFixed;
  const ageCategory = (body?.ageCategory ?? body?.age_category) as "adult" | "kitten" | "" | undefined;

  try {
    const service = await createServiceClient();
    const { data: existing } = await service
      .from("cats")
      .select("help_request_id, trapped_status, appointment_status, age_category, gender")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Cat not found" }, { status: 404 });
    }

    const claimBlock = await caseClaimBlockForId({
      service,
      helpRequestId: existing.help_request_id,
      profile: profile!,
    });
    if (claimBlock) return claimBlock;

    const resolvedAppointmentStatus =
      body?.appointment_status !== undefined ? appointmentStatus : existing.appointment_status;

    const clinicFixed = fixedAtClinicProvided
      ? fixedAtClinic
      : isTrackedCatClinicFixed({
          trapped_status:
            body?.trapped_status !== undefined ? trappedStatus : existing.trapped_status,
          appointment_status: resolvedAppointmentStatus,
        });

    const wentToFoster = (
      transferredUnfixed ? "yes" : (body?.wentToFoster ?? "")
    ) as "" | "yes" | "no";
    const fosterFacility = (body?.fosterFacility ?? "") as FosterFacility | "";
    const fosterFacilityOther = (body?.fosterFacilityOther ?? "") as string;

    const { error: fosterError, fields: fosterFields } = resolveTrackedCatFosterFields({
      wentToFoster,
      fosterFacility,
      fosterFacilityOther,
      clinicFixed,
      requireFoster: clinicFixed || transferredUnfixed,
    });
    if (fosterError) {
      return NextResponse.json({ error: fosterError }, { status: 400 });
    }

    const gender =
      body?.gender !== undefined ? emptyOrNull(body?.gender) : undefined;
    const resolvedGender = gender !== undefined ? gender : existing.gender;

    const updatePayload: Record<string, unknown> = {};

    if (body?.name !== undefined) updatePayload.name = emptyOrNull(body.name);
    if (gender !== undefined) updatePayload.gender = gender;
    if (body?.gender !== undefined || body?.femaleReproductiveStatus !== undefined) {
      updatePayload.female_reproductive_status = resolveFemaleReproductiveStatusForSave(
        resolvedGender,
        body?.femaleReproductiveStatus
      );
    }
    if (body?.colors !== undefined) updatePayload.colors = emptyOrNull(body.colors);
    if (body?.breed !== undefined) updatePayload.breed = emptyOrNull(body.breed);
    if (body?.microchip_id !== undefined) updatePayload.microchip_id = emptyOrNull(body.microchip_id);
    if (body?.clinic_id !== undefined) updatePayload.clinic_id = emptyOrNull(body.clinic_id);
    if (body?.clinic_name !== undefined) updatePayload.clinic_name = emptyOrNull(body.clinic_name);
    if (body?.medical_notes !== undefined) {
      updatePayload.medical_notes = emptyOrNull(body.medical_notes);
    }
    if (body?.appointment_status !== undefined) {
      updatePayload.appointment_status = resolvedAppointmentStatus;
    }
    if (body?.notes !== undefined) updatePayload.notes = emptyOrNull(body.notes);

    const fixDate = parseIsoDate(body?.fixDate);
    const clinicName = emptyOrNull(body?.clinicName ?? body?.clinic_name);
    if (fixedAtClinic && body?.fixDate !== undefined && !fixDate) {
      return NextResponse.json(
        { error: "Enter a valid fix date like September 4, 2026." },
        { status: 400 }
      );
    }
    if (
      (transferredUnfixed || alreadyFixed) &&
      ageCategory !== "adult" &&
      ageCategory !== "kitten"
    ) {
      return NextResponse.json(
        { error: "Select adult or kitten." },
        { status: 400 }
      );
    }

    if (
      fixedAtClinicProvided ||
      body?.transferredUnfixed !== undefined ||
      body?.alreadyFixed !== undefined
    ) {
      if (fixedAtClinic) {
        updatePayload.transferred_unfixed = false;
        updatePayload.already_fixed = false;
        updatePayload.trapped_status = "Trapped";
        updatePayload.appointment_status = "Complete";
        updatePayload.age_category =
          ageCategory === "adult" || ageCategory === "kitten" ? ageCategory : null;
        if (body?.clinicName !== undefined || body?.clinic_name !== undefined) {
          updatePayload.clinic_name = clinicName;
        }
        if (fixDate) updatePayload.return_date = fixDate;
      } else if (alreadyFixed) {
        updatePayload.already_fixed = true;
        updatePayload.transferred_unfixed = false;
        updatePayload.trapped_status = null;
        updatePayload.appointment_status = null;
        updatePayload.clinic_name = null;
        updatePayload.age_category = ageCategory;
      } else if (transferredUnfixed) {
        updatePayload.already_fixed = false;
        updatePayload.transferred_unfixed = true;
        updatePayload.trapped_status = null;
        updatePayload.appointment_status = null;
        updatePayload.clinic_name = null;
        updatePayload.age_category = ageCategory;
      } else {
        updatePayload.transferred_unfixed = false;
        updatePayload.already_fixed = false;
        updatePayload.trapped_status = null;
        updatePayload.appointment_status = null;
        updatePayload.age_category = null;
      }
    } else {
      if (body?.trapped_status !== undefined) {
        updatePayload.trapped_status = trappedStatus;
      }
      if (body?.age_category !== undefined || body?.ageCategory !== undefined) {
        updatePayload.age_category =
          ageCategory === "adult" || ageCategory === "kitten"
            ? ageCategory
            : ageCategory === ""
              ? null
              : existing.age_category;
      }
    }

    if (fosterFields) {
      Object.assign(updatePayload, fosterFields);
    }

    const { data: cat, error: updateError } = await service
      .from("cats")
      .update(updatePayload)
      .eq("id", id)
      .select("*")
      .single();

    if (updateError || !cat) {
      return NextResponse.json(
        { error: updateError?.message ?? "Unable to save tracked cat" },
        { status: 400 }
      );
    }

    let removedClinicFixes = 0;
    if (fixedAtClinicProvided && !fixedAtClinic) {
      const { count, error: countError } = await service
        .from("clinic_fixes")
        .select("id", { count: "exact", head: true })
        .eq("cat_id", id);
      if (countError) {
        return NextResponse.json({ error: countError.message }, { status: 400 });
      }
      removedClinicFixes = count ?? 0;
      const { error: deleteFixError } = await service.from("clinic_fixes").delete().eq("cat_id", id);
      if (deleteFixError) {
        return NextResponse.json({ error: deleteFixError.message }, { status: 400 });
      }
    }

    await syncTrackedCatFixesForCase(service, existing.help_request_id, {
      removedClinicFixes,
    });

    if (fixedAtClinic && (fixDate || clinicName)) {
      const fixPatch: Record<string, string> = {};
      if (fixDate) fixPatch.fix_date = fixDate;
      if (clinicName) fixPatch.clinic_name = clinicName;
      const { error: fixError } = await service
        .from("clinic_fixes")
        .update(fixPatch)
        .eq("cat_id", id);
      if (fixError) {
        return NextResponse.json({ error: fixError.message }, { status: 400 });
      }
    }

    return NextResponse.json({ cat });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to save tracked cat";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { profile, response } = await requireCaseWorker();
  if (response) return response;

  const { id } = await params;

  try {
    const service = await createServiceClient();
    const { data: existing } = await service
      .from("cats")
      .select("help_request_id")
      .eq("id", id)
      .single();

    if (!existing) {
      return NextResponse.json({ error: "Cat not found" }, { status: 404 });
    }

    const claimBlock = await caseClaimBlockForId({
      service,
      helpRequestId: existing.help_request_id,
      profile: profile!,
    });
    if (claimBlock) return claimBlock;

    const { error: deleteError } = await service.from("cats").delete().eq("id", id);

    if (deleteError) {
      return NextResponse.json({ error: deleteError.message }, { status: 400 });
    }

    await updateHelpRequestCatCounts(service, existing.help_request_id);

    return NextResponse.json({ success: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to remove tracked cat";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
