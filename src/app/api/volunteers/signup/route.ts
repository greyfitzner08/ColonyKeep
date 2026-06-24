import { NextRequest, NextResponse } from "next/server";
import { createClient, createServiceClient } from "@/lib/supabase/server";
import { isKnownUserRole } from "@/lib/constants";
import { getEmailValidationError, parsePrimaryEmail } from "@/lib/email-utils";
import {
  ADMIN_ONLY_VOLUNTEER_ROLES,
  invalidRolesForMinorSignup,
  isUnder18,
} from "@/lib/volunteers/age-eligibility";
import { isExemptFromVolunteerApplication } from "@/lib/volunteers/application-requirements";
import { isHomeAddressComplete } from "@/lib/volunteers/contact-fields";
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

  const homeAddress = {
    home_street: typeof body.home_street === "string" ? body.home_street.trim() : "",
    home_city: typeof body.home_city === "string" ? body.home_city.trim() : "",
    home_state: typeof body.home_state === "string" ? body.home_state.trim() : "",
    home_zip: typeof body.home_zip === "string" ? body.home_zip.trim() : "",
    home_county: typeof body.home_county === "string" ? body.home_county.trim() : "",
  };

  if (!isHomeAddressComplete(homeAddress)) {
    return NextResponse.json(
      { error: "Home street, city, ZIP code, and county are required" },
      { status: 400 }
    );
  }

  const phone = typeof body.phone === "string" ? body.phone.trim() : "";
  if (!phone) {
    return NextResponse.json({ error: "Phone is required" }, { status: 400 });
  }

  const rolesRequested = (body.roles_requested ?? []) as VolunteerRole[];
  if (rolesRequested.length === 0) {
    return NextResponse.json({ error: "Select at least one role" }, { status: 400 });
  }

  const adminOnlySelected = rolesRequested.filter((role) =>
    ADMIN_ONLY_VOLUNTEER_ROLES.includes(role)
  );
  if (adminOnlySelected.length > 0) {
    return NextResponse.json(
      { error: "One or more selected roles cannot be requested on the public application." },
      { status: 400 }
    );
  }

  if (isUnder18(birthday)) {
    const restricted = invalidRolesForMinorSignup(rolesRequested);
    if (restricted.length > 0) {
      return NextResponse.json(
        {
          error:
            "Volunteers under 18 can only apply for photographer, videographer, social media, crafter, and community outreach roles. Trapping, transport, and recovery space roles require you to be 18 or older.",
        },
        { status: 400 }
      );
    }
  }

  const service = await createServiceClient();

  const { data: existing } = await service
    .from("volunteer_applications")
    .select("id")
    .eq("email", volunteerEmail)
    .maybeSingle();

  if (existing) {
    return NextResponse.json(
      { error: "An application is already on file for this email." },
      { status: 400 }
    );
  }

  const whyVolunteer =
    (typeof body.prior_experience === "string" ? body.prior_experience.trim() : "") ||
    "Volunteer application";

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  let applicationStatus: "pending" | "approved" = "pending";
  let reviewedBy: string | null = null;
  let reviewedAt: string | null = null;

  if (user) {
    const { data: actorProfile } = await service
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .single();

    if (
      actorProfile &&
      isKnownUserRole(actorProfile.role) &&
      !isExemptFromVolunteerApplication(actorProfile)
    ) {
      applicationStatus = "approved";
      reviewedBy = "volunteer-backfill";
      reviewedAt = new Date().toISOString();
    }
  }

  const { error } = await service.from("volunteer_applications").insert({
    status: applicationStatus,
    reviewed_by: reviewedBy,
    reviewed_at: reviewedAt,
    full_name: body.full_name?.trim(),
    email: volunteerEmail,
    phone,
    birthday,
    home_street: homeAddress.home_street,
    home_city: homeAddress.home_city,
    home_state: homeAddress.home_state || null,
    home_zip: homeAddress.home_zip,
    home_county: homeAddress.home_county,
    roles_requested: rolesRequested,
    why_volunteer: whyVolunteer,
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

  if (user) {
    await service
      .from("profiles")
      .update({
        full_name: body.full_name?.trim() || null,
        birthday,
        phone,
        home_street: homeAddress.home_street,
        home_city: homeAddress.home_city,
        home_state: homeAddress.home_state || null,
        home_zip: homeAddress.home_zip,
        home_county: homeAddress.home_county,
        ...(body.tnvr_certificate_uploaded && body.tnvr_certificate_url
          ? {
              tnvr_certificate_uploaded: true,
              tnvr_certificate_url: body.tnvr_certificate_url,
            }
          : {}),
      })
      .eq("id", user.id);
  }

  return NextResponse.json({ ok: true, autoApproved: applicationStatus === "approved" });
}
