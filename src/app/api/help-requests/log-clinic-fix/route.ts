import { NextRequest, NextResponse } from "next/server";
import { requireAppointmentManager } from "@/lib/api/auth";
import { recordClinicFix } from "@/lib/cases/record-clinic-fix";
import { createClient, createServiceClient } from "@/lib/supabase/server";

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
  const { helpRequestId, ageCategory, gender, clinicName, fixDate, notes } = body as {
    helpRequestId?: string;
    ageCategory?: "adult" | "kitten";
    gender?: "male" | "female";
    clinicName?: string;
    fixDate?: string;
    notes?: string;
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

  try {
    const { summary } = await recordClinicFix(service, {
      helpRequestId,
      ageCategory,
      gender,
      clinicName: clinicName?.trim() || null,
      fixDate,
      notes: notes?.trim() || null,
      actorEmail: user.email!,
      actorName: profile!.full_name ?? user.email!,
    });

    return NextResponse.json({ success: true, summary });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unable to log clinic fix";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
