import { NextRequest, NextResponse } from "next/server";
import { requireCaseWorker } from "@/lib/api/auth";
import { caseClaimBlockForId } from "@/lib/cases/case-claim-block";
import { resolveTrackedCatFosterFields } from "@/lib/cases/tracked-cat-foster";
import {
  syncTrackedCatFixesForCase,
  updateHelpRequestCatCounts,
} from "@/lib/cases/tracked-cat-fix";
import { createServiceClient } from "@/lib/supabase/server";
import type { FosterFacility } from "@/lib/cases/foster-facility";
import { resolveFemaleReproductiveStatusForSave } from "@/lib/cases/female-reproductive-status";

const MAX_CATS_PER_SAVE = 30;

type CatGroupInput = {
  count?: unknown;
  gender?: unknown;
  clinicName?: unknown;
  medical_notes?: unknown;
  wentToFoster?: unknown;
  fosterFacility?: unknown;
  fosterFacilityOther?: unknown;
};

function parseCatGroups(
  groups: unknown
): { error: string } | { rows: Record<string, unknown>[]; anyFixed: boolean } {
  if (!Array.isArray(groups) || groups.length === 0) {
    return { error: "Add at least one group of cats." };
  }

  const rows: Record<string, unknown>[] = [];
  let anyFixed = false;

  for (const [index, raw] of groups.entries()) {
    const group = (raw ?? {}) as CatGroupInput;
    const label = `Group ${index + 1}`;
    const count = Math.floor(Number(group.count));
    if (!Number.isFinite(count) || count < 1) {
      return { error: `${label}: enter how many cats.` };
    }
    const gender = typeof group.gender === "string" ? group.gender.trim().toLowerCase() : "";
    if (gender !== "male" && gender !== "female") {
      return { error: `${label}: select male or female.` };
    }
    const clinicName = typeof group.clinicName === "string" ? group.clinicName.trim() : "";
    const fixedAtClinic = clinicName.length > 0;
    const wentToFoster = (group.wentToFoster ?? "") as "" | "yes" | "no";
    const { error: fosterError, fields: fosterFields } = resolveTrackedCatFosterFields({
      wentToFoster,
      fosterFacility: (group.fosterFacility ?? "") as FosterFacility | "",
      fosterFacilityOther: typeof group.fosterFacilityOther === "string" ? group.fosterFacilityOther : "",
      clinicFixed: fixedAtClinic,
      requireFoster: fixedAtClinic,
    });
    if (fosterError) return { error: `${label}: ${fosterError}` };

    const medicalNotes =
      typeof group.medical_notes === "string" && group.medical_notes.trim()
        ? group.medical_notes.trim()
        : null;

    const row = {
      gender,
      medical_notes: medicalNotes,
      ...(fosterFields ?? {}),
      ...(fixedAtClinic
        ? {
            clinic_name: clinicName.slice(0, 120),
            trapped_status: "Trapped",
            appointment_status: "Complete",
          }
        : {}),
    };
    if (fixedAtClinic) anyFixed = true;
    for (let i = 0; i < count; i += 1) rows.push({ ...row });
  }

  if (rows.length > MAX_CATS_PER_SAVE) {
    return { error: `Add up to ${MAX_CATS_PER_SAVE} cats at a time.` };
  }

  return { rows, anyFixed };
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireCaseWorker();
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
    const claimBlock = await caseClaimBlockForId({
      service,
      helpRequestId,
      profile: profile!,
    });
    if (claimBlock) return claimBlock;

    if (Array.isArray(body?.groups)) {
      const parsed = parseCatGroups(body.groups);
      if ("error" in parsed) {
        return NextResponse.json({ error: parsed.error }, { status: 400 });
      }
      const { rows, anyFixed } = parsed;
      const { data: cats, error: insertError } = await service
        .from("cats")
        .insert(rows.map((row) => ({ ...row, help_request_id: helpRequestId })))
        .select("*");

      if (insertError || !cats) {
        return NextResponse.json(
          { error: insertError?.message ?? "Unable to add cats" },
          { status: 400 }
        );
      }

      if (anyFixed) {
        await syncTrackedCatFixesForCase(service, helpRequestId);
      } else if (cats.some((cat) => cat.went_to_foster_facility)) {
        await updateHelpRequestCatCounts(service, helpRequestId);
      }

      return NextResponse.json({ cats });
    }

    const rawGender = typeof body?.gender === "string" ? body.gender.trim().toLowerCase() : "";
    if (rawGender !== "male" && rawGender !== "female") {
      return NextResponse.json(
        { error: "Gender is required — select male or female." },
        { status: 400 }
      );
    }
    const gender = rawGender;

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
