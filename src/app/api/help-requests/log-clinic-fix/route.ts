import { NextRequest, NextResponse } from "next/server";
import { requireAppointmentManager } from "@/lib/api/auth";
import { recordClinicFix } from "@/lib/cases/record-clinic-fix";
import type { RecordClinicFixInput } from "@/lib/cases/record-clinic-fix";
import { saveTrackedCatFromClinicLog } from "@/lib/cases/save-tracked-cat-from-clinic-log";
import { parseFemaleReproductiveStatus, type TrackedCatDetails } from "@/lib/cases/tracked-cat-form";
import { isAutoSyncedClinicFix } from "@/lib/cases/tracked-cat-fix";
import { createClient, createServiceClient } from "@/lib/supabase/server";

function readCatDetails(body: Record<string, unknown>): TrackedCatDetails {
  return {
    name: String(body.name ?? ""),
    gender: body.gender === "male" || body.gender === "female" ? body.gender : "",
    femaleReproductiveStatus: parseFemaleReproductiveStatus(body.femaleReproductiveStatus),
    colors: String(body.colors ?? ""),
    microchip_id: String(body.microchip_id ?? ""),
    medical_notes: String(body.medical_notes ?? ""),
  };
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireAppointmentManager();
  if (response) return response;

  const supabase = await createClient();
  const service = await createServiceClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await request.json();
  const {
    helpRequestId,
    catId,
    ageCategory,
    gender,
    clinicName,
    fixDate,
    wentToFosterFacility,
    fosterFacility,
    fosterFacilityOther,
  } = body as {
    helpRequestId?: string;
    catId?: string;
    ageCategory?: "adult" | "kitten";
    gender?: "male" | "female";
    clinicName?: string;
    fixDate?: string;
    wentToFosterFacility?: boolean;
    fosterFacility?: string;
    fosterFacilityOther?: string;
  };
  const details = readCatDetails(body);

  if (!helpRequestId) {
    return NextResponse.json({ error: "Missing helpRequestId" }, { status: 400 });
  }

  if (ageCategory !== "adult" && ageCategory !== "kitten") {
    return NextResponse.json({ error: "Select adult or kitten" }, { status: 400 });
  }

  const resolvedGender = details.gender || gender;
  if (resolvedGender !== "male" && resolvedGender !== "female") {
    return NextResponse.json({ error: "Select male or female" }, { status: 400 });
  }

  if (typeof wentToFosterFacility !== "boolean") {
    return NextResponse.json(
      { error: "Select whether the cat went to foster/facility or returned to colony." },
      { status: 400 }
    );
  }

  if (catId) {
    const { data: existingFix } = await service
      .from("clinic_fixes")
      .select("id, logged_by")
      .eq("cat_id", catId)
      .maybeSingle();

    if (existingFix && !isAutoSyncedClinicFix(existingFix)) {
      return NextResponse.json({ error: "Clinic fix already logged for this cat" }, { status: 400 });
    }
  }

  try {
    const catDetails: TrackedCatDetails = {
      ...details,
      gender: resolvedGender,
    };

    const savedCatId = await saveTrackedCatFromClinicLog(service, {
      helpRequestId,
      catId: catId ?? null,
      clinicName: clinicName?.trim() || null,
      details: catDetails,
      ageCategory,
      wentToFosterFacility,
      fosterFacility: (fosterFacility as RecordClinicFixInput["fosterFacility"]) ?? null,
      fosterFacilityOther: fosterFacilityOther?.trim() || null,
      skipFixSync: true,
    });

    const { summary } = await recordClinicFix(service, {
      helpRequestId,
      catId: savedCatId,
      ageCategory,
      gender: resolvedGender,
      clinicName: clinicName?.trim() || null,
      fixDate,
      notes: catDetails.medical_notes.trim() || null,
      wentToFosterFacility,
      fosterFacility: (fosterFacility as RecordClinicFixInput["fosterFacility"]) ?? null,
      fosterFacilityOther: fosterFacilityOther?.trim() || null,
      actorEmail: user.email!,
      actorName: profile!.full_name ?? user.email!,
    });

    return NextResponse.json({ success: true, summary, catId: savedCatId });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to log clinic fix";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
