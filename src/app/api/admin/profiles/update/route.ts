import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { isHomeAddressComplete, parseVolunteerContactUpdate } from "@/lib/volunteers/contact-fields";
import { syncVolunteerContactRecords } from "@/lib/volunteers/contact-sync";
import type { UserRole, VolunteerRole } from "@/lib/types";

export async function POST(request: NextRequest) {
  const { response } = await requireApiRole(["admin"]);
  if (response) return response;

  const body = await request.json();
  const { userId, role, teamId, volunteer_roles } = body as {
    userId?: string;
    role?: UserRole;
    teamId?: string | null;
    volunteer_roles?: VolunteerRole[];
  };

  if (!userId) {
    return NextResponse.json({ error: "Missing userId" }, { status: 400 });
  }

  const contactFields = parseVolunteerContactUpdate(body);
  const service = await createServiceClient();

  const { data: existingProfile, error: loadError } = await service
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single();

  if (loadError || !existingProfile) {
    return NextResponse.json({ error: "Profile not found" }, { status: 404 });
  }

  const roleUpdates: {
    role?: UserRole;
    team_id?: string | null;
    volunteer_roles?: VolunteerRole[];
  } = {};

  if (role !== undefined) roleUpdates.role = role;
  if (teamId !== undefined) roleUpdates.team_id = teamId;
  if (volunteer_roles !== undefined) roleUpdates.volunteer_roles = volunteer_roles;

  if (Object.keys(contactFields).length > 0) {
    if (contactFields.full_name !== undefined && !contactFields.full_name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    if (contactFields.phone !== undefined && !contactFields.phone) {
      return NextResponse.json({ error: "Phone is required" }, { status: 400 });
    }

    const mergedAddress = {
      home_street: contactFields.home_street ?? existingProfile.home_street,
      home_city: contactFields.home_city ?? existingProfile.home_city,
      home_state: contactFields.home_state ?? existingProfile.home_state,
      home_zip: contactFields.home_zip ?? existingProfile.home_zip,
      home_county: contactFields.home_county ?? existingProfile.home_county,
    };

    const addressTouched =
      contactFields.home_street !== undefined ||
      contactFields.home_city !== undefined ||
      contactFields.home_state !== undefined ||
      contactFields.home_zip !== undefined ||
      contactFields.home_county !== undefined;

    if (addressTouched && !isHomeAddressComplete(mergedAddress)) {
      return NextResponse.json(
        { error: "Home street, city, ZIP code, and county are required" },
        { status: 400 }
      );
    }

    const contactResult = await syncVolunteerContactRecords(service, {
      userId,
      previousEmail: existingProfile.email,
      fields: contactFields,
      updateAuthEmail: true,
      existingHomeAddress: {
        home_street: existingProfile.home_street,
        home_city: existingProfile.home_city,
        home_state: existingProfile.home_state,
        home_zip: existingProfile.home_zip,
        home_county: existingProfile.home_county,
      },
    });

    if (contactResult.error) {
      return NextResponse.json({ error: contactResult.error }, { status: 400 });
    }
  }

  if (Object.keys(roleUpdates).length === 0 && Object.keys(contactFields).length === 0) {
    return NextResponse.json({ error: "No profile fields to update" }, { status: 400 });
  }

  if (Object.keys(roleUpdates).length > 0) {
    const { error } = await service.from("profiles").update(roleUpdates).eq("id", userId);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }
  }

  return NextResponse.json({ success: true });
}
