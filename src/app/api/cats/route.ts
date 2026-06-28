import { NextRequest, NextResponse } from "next/server";
import { requireCaseWorker } from "@/lib/api/auth";
import {
  fosterFormToPayload,
  hasFosterFormAnswer,
  trackedCatReturnFields,
  validateTrackedCatFosterForm,
} from "@/lib/cases/tracked-cat-foster";
import { validateFosterFacilityInput } from "@/lib/cases/foster-facility";
import { syncTrackedCatFixesForCase } from "@/lib/cases/tracked-cat-fix";
import { createServiceClient } from "@/lib/supabase/server";
import type { FosterFacility } from "@/lib/cases/foster-facility";

export async function POST(request: NextRequest) {
  const { response } = await requireCaseWorker();
  if (response) return response;

  const body = await request.json().catch(() => null);
  const helpRequestId = body?.helpRequestId as string | undefined;
  const fixedAtClinic = body?.fixedAtClinic === true;
  const ageCategory = body?.ageCategory as "adult" | "kitten" | undefined;

  if (!helpRequestId) {
    return NextResponse.json({ error: "Missing helpRequestId" }, { status: 400 });
  }

  if (fixedAtClinic && ageCategory !== "adult" && ageCategory !== "kitten") {
    return NextResponse.json({ error: "Select adult or kitten" }, { status: 400 });
  }

  const wentToFoster = (body?.wentToFoster ?? "") as "" | "yes" | "no";
  const fosterFacility = (body?.fosterFacility ?? "") as FosterFacility | "";
  const fosterFacilityOther = (body?.fosterFacilityOther ?? "") as string;

  const fosterError = validateTrackedCatFosterForm(
    { wentToFoster, fosterFacility, fosterFacilityOther },
    { required: fixedAtClinic }
  );
  if (fosterError) {
    return NextResponse.json({ error: fosterError }, { status: 400 });
  }

  const fosterPayload = hasFosterFormAnswer(wentToFoster)
    ? fosterFormToPayload({ wentToFoster, fosterFacility, fosterFacilityOther })
    : null;

  if (fosterPayload) {
    const validationError = validateFosterFacilityInput({
      wentToFosterFacility: fosterPayload.wentToFosterFacility,
      fosterFacility: fosterPayload.fosterFacility,
      fosterFacilityOther: fosterPayload.fosterFacilityOther,
    });
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
  }

  const returnFields = fosterPayload
    ? trackedCatReturnFields({
        wentToFosterFacility: fosterPayload.wentToFosterFacility,
        fosterFacility: fosterPayload.fosterFacility as FosterFacility | null,
        fosterFacilityOther: fosterPayload.fosterFacilityOther,
      })
    : null;

  try {
    const service = await createServiceClient();
    const { data: cat, error: insertError } = await service
      .from("cats")
      .insert({
        help_request_id: helpRequestId,
        name: body?.name?.trim() || null,
        gender: body?.gender?.trim() || null,
        colors: body?.colors?.trim() || null,
        microchip_id: body?.microchip_id?.trim() || null,
        medical_notes: body?.medical_notes?.trim() || null,
        ...(returnFields ?? {}),
        ...(fixedAtClinic && {
          trapped_status: "Trapped",
          appointment_status: "Complete",
          age_category: ageCategory,
        }),
      })
      .select("*")
      .single();

    if (insertError || !cat) {
      return NextResponse.json(
        { error: insertError?.message ?? "Unable to add tracked cat" },
        { status: 400 }
      );
    }

    if (fixedAtClinic) {
      await syncTrackedCatFixesForCase(service, helpRequestId);
    }

    return NextResponse.json({ cat });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add tracked cat";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
