import { NextRequest, NextResponse } from "next/server";
import { requireCaseWorker } from "@/lib/api/auth";
import { isTrackedCatClinicFixed } from "@/lib/cases/tracked-cat-fix";
import { resolveTrackedCatFosterFields } from "@/lib/cases/tracked-cat-foster";
import { syncTrackedCatFixesForCase, updateHelpRequestCatCounts } from "@/lib/cases/tracked-cat-fix";
import { createServiceClient } from "@/lib/supabase/server";
import type { FosterFacility } from "@/lib/cases/foster-facility";
import { resolveFemaleReproductiveStatusForSave } from "@/lib/cases/female-reproductive-status";

function emptyOrNull(value: unknown) {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : null;
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { response } = await requireCaseWorker();
  if (response) return response;

  const { id } = await params;
  const body = await request.json().catch(() => null);

  const trappedStatus = emptyOrNull(body?.trapped_status);
  const appointmentStatus = emptyOrNull(body?.appointment_status);

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

    const resolvedAppointmentStatus =
      body?.appointment_status !== undefined ? appointmentStatus : existing.appointment_status;

    const clinicFixed = isTrackedCatClinicFixed({
      trapped_status:
        body?.trapped_status !== undefined ? trappedStatus : existing.trapped_status,
      appointment_status: resolvedAppointmentStatus,
    });

    const ageCategory = body?.age_category as "adult" | "kitten" | "" | undefined;
    if (clinicFixed && ageCategory !== "adult" && ageCategory !== "kitten") {
      return NextResponse.json({ error: "Select adult or kitten." }, { status: 400 });
    }

    const wentToFoster = (body?.wentToFoster ?? "") as "" | "yes" | "no";
    const fosterFacility = (body?.fosterFacility ?? "") as FosterFacility | "";
    const fosterFacilityOther = (body?.fosterFacilityOther ?? "") as string;

    const { error: fosterError, fields: fosterFields } = resolveTrackedCatFosterFields({
      wentToFoster,
      fosterFacility,
      fosterFacilityOther,
      clinicFixed,
      requireFoster: clinicFixed,
    });
    if (fosterError) {
      return NextResponse.json({ error: fosterError }, { status: 400 });
    }

    const gender =
      body?.gender !== undefined ? emptyOrNull(body?.gender) : undefined;
    const resolvedGender = gender !== undefined ? gender : existing.gender;

    const updatePayload: Record<string, unknown> = {
      name: emptyOrNull(body?.name),
      ...(gender !== undefined ? { gender } : {}),
      ...(body?.gender !== undefined || body?.femaleReproductiveStatus !== undefined
        ? {
            female_reproductive_status: resolveFemaleReproductiveStatusForSave(
              resolvedGender,
              body?.femaleReproductiveStatus
            ),
          }
        : {}),
      colors: emptyOrNull(body?.colors),
      breed: emptyOrNull(body?.breed),
      microchip_id: emptyOrNull(body?.microchip_id),
      clinic_id: emptyOrNull(body?.clinic_id),
      clinic_name: emptyOrNull(body?.clinic_name),
      medical_notes: emptyOrNull(body?.medical_notes),
      appointment_status: resolvedAppointmentStatus,
      notes: emptyOrNull(body?.notes),
      age_category: clinicFixed ? ageCategory : existing.age_category,
      ...(fosterFields ?? {}),
    };

    if (body?.trapped_status !== undefined) {
      updatePayload.trapped_status = trappedStatus;
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

    await syncTrackedCatFixesForCase(service, existing.help_request_id);

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
  const { response } = await requireCaseWorker();
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
