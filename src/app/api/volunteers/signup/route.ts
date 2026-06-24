import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/lib/supabase/server";
import { getEmailValidationError, parsePrimaryEmail } from "@/lib/email-utils";
import { hasRestrictedRoleForMinor, isUnder18 } from "@/lib/volunteers/age-eligibility";
import type { VolunteerRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  const body = await request.json();
  const volunteerEmail = parsePrimaryEmail(body.email);
  const emailError = getEmailValidationError(body.email);

  if (!volunteerEmail || emailError) {
    return NextResponse.json({ error: emailError ?? "Invalid email address" }, { status: 400 });
  }

  if (!body.liability_waiver_opened || !body.liability_waiver_signed) {
    return NextResponse.json(
      { error: "You must open and accept the liability waiver before applying." },
      { status: 400 }
    );
  }

  if (!body.policy_opened || !body.policy_signed) {
    return NextResponse.json(
      { error: "You must open and accept the policy & procedures before applying." },
      { status: 400 }
    );
  }

  const birthday = typeof body.birthday === "string" ? body.birthday.trim() : "";
  if (!birthday) {
    return NextResponse.json({ error: "Birthday is required" }, { status: 400 });
  }

  const rolesRequested = (body.roles_requested ?? []) as VolunteerRole[];
  if (rolesRequested.length === 0) {
    return NextResponse.json({ error: "Select at least one role" }, { status: 400 });
  }

  if (isUnder18(birthday)) {
    const restricted = hasRestrictedRoleForMinor(rolesRequested);
    if (restricted.length > 0) {
      return NextResponse.json(
        {
          error:
            "Volunteers under 18 cannot apply for intake, trapping, trap loan, or grant writing roles.",
        },
        { status: 400 }
      );
    }
  }

  const service = await createServiceClient();

  const { error } = await service.from("volunteer_applications").insert({
    status: "pending",
    full_name: body.full_name?.trim(),
    email: volunteerEmail,
    phone: body.phone,
    birthday,
    roles_requested: rolesRequested,
    prior_experience: body.prior_experience || null,
    how_heard: body.how_heard || null,
    liability_waiver_signed: Boolean(body.liability_waiver_signed),
    policy_signed: Boolean(body.policy_signed),
    tnvr_certificate_uploaded: Boolean(body.tnvr_certificate_uploaded),
    tnvr_certificate_url: body.tnvr_certificate_url ?? null,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ ok: true });
}
