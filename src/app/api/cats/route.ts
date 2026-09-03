import { NextRequest, NextResponse } from "next/server";
import { requireCaseWorker } from "@/lib/api/auth";
import { resolveTrackedCatFosterFields } from "@/lib/cases/tracked-cat-foster";
import {
  syncTrackedCatFixesForCase,
  updateHelpRequestCatCounts,
} from "@/lib/cases/tracked-cat-fix";
import { createServiceClient } from "@/lib/supabase/server";
import type { FosterFacility } from "@/lib/cases/foster-facility";
import { resolveFemaleReproductiveStatusForSave } from "@/lib/cases/female-reproductive-status";

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

  const wentToFoster = (body?.wentToFoster ?? "") as "" | "yes" | "no";
  const fosterFacility = (body?.fosterFacility ?? "") as FosterFacility | "";
  const fosterFacilityOther = (body?.fosterFacilityOther ?? "") as string;

  const { error: fosterError, fields: fosterFields } = resolveTrackedCatFosterFields({
    wentToFoster,
    fosterFacility,
    fosterFacilityOther,
    clinicFixed: fixedAtClinic,
    requireFoster: fixedAtClinic,
  });
  if (fosterError) {
    return NextResponse.json({ error: fosterError }, { status: 400 });
  }

  try {
    const service = await createServiceClient();
    const gender = body?.gender?.trim() || null;
    const { data: cat, error: insertError } = await service
      .from("cats")
      .insert({
        help_request_id: helpRequestId,
        name: body?.name?.trim() || null,
        gender,
        female_reproductive_status: resolveFemaleReproductiveStatusForSave(
          gender,
          body?.femaleReproductiveStatus
        ),
        colors: body?.colors?.trim() || null,
        microchip_id: body?.microchip_id?.trim() || null,
        medical_notes: body?.medical_notes?.trim() || null,
        ...(fosterFields ?? {}),
        ...(fixedAtClinic && {
          trapped_status: "Trapped",
          appointment_status: "Complete",
          age_category:
            ageCategory === "adult" || ageCategory === "kitten" ? ageCategory : null,
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
    } else if (fosterFields?.went_to_foster_facility) {
      await updateHelpRequestCatCounts(service, helpRequestId);
    }

    return NextResponse.json({ cat });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to add tracked cat";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
