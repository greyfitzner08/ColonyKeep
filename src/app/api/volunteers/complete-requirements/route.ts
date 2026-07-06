import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import {
  getMissingUserCompletableRequirements,
  isExemptFromVolunteerApplication,
} from "@/lib/volunteers/application-requirements";

export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const service = await createServiceClient();
  const { data: profile, error: profileError } = await service
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (profileError || !profile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  if (isExemptFromVolunteerApplication(profile)) {
    return NextResponse.json({ error: "Staff accounts do not use this flow" }, { status: 400 });
  }

  const { data: application, error: applicationError } = await service
    .from("volunteer_applications")
    .select("*")
    .eq("email", profile.email)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (applicationError || !application) {
    return NextResponse.json({ error: "Volunteer application not found" }, { status: 404 });
  }

  if (application.status !== "approved") {
    return NextResponse.json(
      { error: "Requirements can only be completed after application approval" },
      { status: 400 }
    );
  }

  const body = await request.json();
  const liabilitySigned = Boolean(body.liability_waiver_signed);
  const policySigned = Boolean(body.policy_signed);
  const certUploaded = Boolean(body.tnvr_certificate_uploaded);
  const certUrl =
    typeof body.tnvr_certificate_url === "string" ? body.tnvr_certificate_url.trim() : null;

  if (liabilitySigned && !body.liability_waiver_opened) {
    return NextResponse.json(
      { error: "Open the liability waiver before agreeing to it." },
      { status: 400 }
    );
  }

  if (policySigned && !body.policy_opened) {
    return NextResponse.json(
      { error: "Open the policy & procedures before agreeing to them." },
      { status: 400 }
    );
  }

  const nextApplication = {
    ...application,
    liability_waiver_signed: application.liability_waiver_signed || liabilitySigned,
    policy_signed: application.policy_signed || policySigned,
    tnvr_certificate_uploaded: application.tnvr_certificate_uploaded || certUploaded,
    tnvr_certificate_url: certUrl || application.tnvr_certificate_url,
  };

  const stillMissing = getMissingUserCompletableRequirements(profile, nextApplication);
  if (stillMissing.length > 0) {
    return NextResponse.json(
      { error: "Complete all required documents and uploads before continuing." },
      { status: 400 }
    );
  }

  const { error: updateError } = await service
    .from("volunteer_applications")
    .update({
      liability_waiver_signed: nextApplication.liability_waiver_signed,
      policy_signed: nextApplication.policy_signed,
      tnvr_certificate_uploaded: nextApplication.tnvr_certificate_uploaded,
      tnvr_certificate_url: nextApplication.tnvr_certificate_url,
      user_requirements_completed_at: new Date().toISOString(),
    })
    .eq("id", application.id);

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 400 });
  }

  if (nextApplication.tnvr_certificate_uploaded && nextApplication.tnvr_certificate_url) {
    await service
      .from("profiles")
      .update({
        tnvr_certificate_uploaded: true,
        tnvr_certificate_url: nextApplication.tnvr_certificate_url,
      })
      .eq("id", profile.id);
  }

  return NextResponse.json({ success: true });
}
