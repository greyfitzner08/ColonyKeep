import { NextRequest, NextResponse } from "next/server";
import { requireAppointmentManager } from "@/lib/api/auth";
import { recordClinicFix } from "@/lib/cases/record-clinic-fix";
import type { RecordClinicFixInput } from "@/lib/cases/record-clinic-fix";
import { trackedCatReturnFields } from "@/lib/cases/tracked-cat-foster";
import { syncTrackedCatFixesForCase } from "@/lib/cases/tracked-cat-fix";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import type { FosterFacility } from "@/lib/cases/foster-facility";

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
    notes,
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
    notes?: string;
    wentToFosterFacility?: boolean;
    fosterFacility?: string;
    fosterFacilityOther?: string;
  };

  if (!helpRequestId) {
    return NextResponse.json({ error: "Missing helpRequestId" }, { status: 400 });
  }

  if (ageCategory !== "adult" && ageCategory !== "kitten") {
    return NextResponse.json({ error: "Select adult or kitten" }, { status: 400 });
  }

  if (gender !== "male" && gender !== "female") {
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
      .select("id")
      .eq("cat_id", catId)
      .maybeSingle();

    if (existingFix) {
      return NextResponse.json({ error: "Clinic fix already logged for this cat" }, { status: 400 });
    }
  }

  try {
    const { summary } = await recordClinicFix(service, {
      helpRequestId,
      catId: catId ?? null,
      ageCategory,
      gender,
      clinicName: clinicName?.trim() || null,
      fixDate,
      notes: notes?.trim() || null,
      wentToFosterFacility,
      fosterFacility: (fosterFacility as RecordClinicFixInput["fosterFacility"]) ?? null,
      fosterFacilityOther: fosterFacilityOther?.trim() || null,
      actorEmail: user.email!,
      actorName: profile!.full_name ?? user.email!,
    });

    if (catId) {
      const returnFields = trackedCatReturnFields({
        wentToFosterFacility,
        fosterFacility: fosterFacility as FosterFacility | null,
        fosterFacilityOther: fosterFacilityOther?.trim() || null,
      });

      await service
        .from("cats")
        .update({
          gender,
          age_category: ageCategory,
          trapped_status: "Trapped",
          appointment_status: "Complete",
          clinic_name: clinicName?.trim() || null,
          ...returnFields,
        })
        .eq("id", catId);

      await syncTrackedCatFixesForCase(service, helpRequestId);
    }

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to log clinic fix";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
