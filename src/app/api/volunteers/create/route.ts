import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { parsePrimaryEmail } from "@/lib/email-utils";
import { createServiceClient } from "@/lib/supabase/server";
import { mapVolunteerImportRow } from "@/lib/volunteers/import-mapper";
import { createVolunteerImportRoleMatcher } from "@/lib/volunteers/import-role-matcher";
import { fetchVolunteerRoleCatalogInputs } from "@/lib/volunteers/load-role-catalog";
import type { VolunteerApplicationStatus, VolunteerRole } from "@/lib/types";

function parseRoles(value: unknown): VolunteerRole[] {
  if (!Array.isArray(value)) return [];
  return value.filter((entry): entry is VolunteerRole => typeof entry === "string" && entry.length > 0);
}

function parseOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function parseOptionalBoolean(value: unknown, fallback = false): boolean {
  if (typeof value === "boolean") return value;
  return fallback;
}

function parseApplicationStatus(value: unknown): VolunteerApplicationStatus {
  const normalized = typeof value === "string" ? value.trim().toLowerCase() : "";
  if (normalized === "approved") return "approved";
  if (normalized === "rejected") return "rejected";
  if (normalized === "needs_followup" || normalized === "needs follow-up") {
    return "needs_followup";
  }
  return "pending";
}

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const email = parsePrimaryEmail(parseOptionalString(body.email));
  if (!email) {
    return NextResponse.json({ error: "A valid email address is required." }, { status: 400 });
  }

  const roles = parseRoles(body.roles);
  const raw = {
    full_name: parseOptionalString(body.fullName ?? body.full_name),
    email,
    phone: parseOptionalString(body.phone),
    birthday: parseOptionalString(body.birthday),
    roles_requested: roles.join(", "),
    prior_experience: parseOptionalString(body.priorExperience ?? body.prior_experience),
    how_heard: parseOptionalString(body.howHeard ?? body.how_heard),
    liability_waiver_signed: parseOptionalBoolean(body.liabilityWaiverSigned ?? body.liability_waiver_signed),
    policy_signed: parseOptionalBoolean(body.policySigned ?? body.policy_signed),
    tnvr_certificate_uploaded: parseOptionalBoolean(
      body.tnvrCertificateUploaded ?? body.tnvr_certificate_uploaded
    ),
    application_status: parseApplicationStatus(body.applicationStatus ?? body.application_status),
    admin_notes: parseOptionalString(body.adminNotes ?? body.admin_notes) || undefined,
  };

  const service = await createServiceClient();
  const { catalog } = await fetchVolunteerRoleCatalogInputs(service);
  const roleMatcher = createVolunteerImportRoleMatcher(catalog);
  const mapped = mapVolunteerImportRow(raw, roleMatcher);

  if (mapped.error || !mapped.record) {
    return NextResponse.json({ error: mapped.error ?? "Invalid volunteer data" }, { status: 400 });
  }

  const { data: existing, error: existingError } = await service
    .from("volunteer_applications")
    .select("id")
    .eq("email", email)
    .maybeSingle();

  if (existingError) {
    return NextResponse.json({ error: existingError.message }, { status: 500 });
  }

  if (existing) {
    return NextResponse.json(
      { error: `A volunteer application already exists for ${email}.` },
      { status: 409 }
    );
  }

  const { data: inserted, error } = await service
    .from("volunteer_applications")
    .insert({
      ...mapped.record,
      why_volunteer: "Added by admin",
      imported_via_csv: true,
    })
    .select("id, full_name, email, status")
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({
    success: true,
    application: inserted,
  });
}
