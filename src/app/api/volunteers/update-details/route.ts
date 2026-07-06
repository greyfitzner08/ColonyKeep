import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import {
  contactFieldsToApplicationUpdate,
  parseVolunteerContactUpdate,
} from "@/lib/volunteers/contact-fields";
import { syncVolunteerContactRecords } from "@/lib/volunteers/contact-sync";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const { applicationId, adminNotes } = body as {
    applicationId?: string;
    adminNotes?: string;
  };

  if (!applicationId) {
    return NextResponse.json({ error: "Missing applicationId" }, { status: 400 });
  }

  const contactFields = parseVolunteerContactUpdate(body);
  const applicationUpdate = contactFieldsToApplicationUpdate(contactFields);

  const updates: Record<string, unknown> = {
    reviewed_by: profile.email,
    reviewed_at: new Date().toISOString(),
    ...applicationUpdate,
  };

  if (adminNotes !== undefined) {
    updates.admin_notes = adminNotes.trim() || null;
  }

  if (Array.isArray(body.roles) || Array.isArray(body.roles_requested)) {
    const rawRoles = (Array.isArray(body.roles) ? body.roles : body.roles_requested) as unknown[];
    const roles = rawRoles.filter(
      (entry): entry is string => typeof entry === "string" && entry.trim().length > 0
    );
    if (roles.length > 0) {
      updates.roles_requested = roles;
    }
  }

  if (Object.keys(updates).length === 2) {
    return NextResponse.json({ error: "No updates provided" }, { status: 400 });
  }

  const service = await createServiceClient();

  const { data: existingApplication, error: loadError } = await service
    .from("volunteer_applications")
    .select("email")
    .eq("id", applicationId)
    .single();

  if (loadError || !existingApplication) {
    return NextResponse.json({ error: "Volunteer application not found" }, { status: 404 });
  }

  const { error } = await service
    .from("volunteer_applications")
    .update(updates)
    .eq("id", applicationId);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  if (Object.keys(contactFields).length > 0) {
    const { data: linkedProfile } = await service
      .from("profiles")
      .select("id, email, home_street, home_city, home_state, home_zip, home_county")
      .eq("email", existingApplication.email)
      .maybeSingle();

    if (linkedProfile) {
      const syncResult = await syncVolunteerContactRecords(service, {
        userId: linkedProfile.id,
        previousEmail: existingApplication.email,
        fields: contactFields,
        updateAuthEmail: true,
        existingHomeAddress: {
          home_street: linkedProfile.home_street,
          home_city: linkedProfile.home_city,
          home_state: linkedProfile.home_state,
          home_zip: linkedProfile.home_zip,
          home_county: linkedProfile.home_county,
        },
      });

      if (syncResult.error) {
        return NextResponse.json({ error: syncResult.error }, { status: 400 });
      }
    }
  }

  return NextResponse.json({ success: true });
}
