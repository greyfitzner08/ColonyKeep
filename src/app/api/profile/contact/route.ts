import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import { isHomeAddressComplete, parseVolunteerContactUpdate } from "@/lib/volunteers/contact-fields";
import { syncVolunteerContactRecords } from "@/lib/volunteers/contact-sync";

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole([
    "admin",
    "volunteer",
    "inquiry_team",
    "trap_team_lead",
    "clinic_coordination",
  ]);
  if (response) return response;

  const body = await request.json();
  const fields = parseVolunteerContactUpdate(body);

  if (fields.full_name !== undefined && !fields.full_name) {
    return NextResponse.json({ error: "Name is required" }, { status: 400 });
  }
  if (fields.phone !== undefined && !fields.phone) {
    return NextResponse.json({ error: "Phone is required" }, { status: 400 });
  }

  const mergedAddress = {
    home_street: fields.home_street ?? profile!.home_street,
    home_city: fields.home_city ?? profile!.home_city,
    home_state: fields.home_state ?? profile!.home_state,
    home_zip: fields.home_zip ?? profile!.home_zip,
    home_county: fields.home_county ?? profile!.home_county,
  };

  const addressTouched =
    fields.home_street !== undefined ||
    fields.home_city !== undefined ||
    fields.home_state !== undefined ||
    fields.home_zip !== undefined ||
    fields.home_county !== undefined;

  if (addressTouched && !isHomeAddressComplete(mergedAddress)) {
    return NextResponse.json(
      { error: "Home street, city, ZIP code, and county are required" },
      { status: 400 }
    );
  }

  const service = await createServiceClient();
  const result = await syncVolunteerContactRecords(service, {
    userId: profile!.id,
    previousEmail: profile!.email,
    fields,
    updateAuthEmail: true,
  });

  if (result.error) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }

  return NextResponse.json({ success: true, email: result.email ?? profile!.email });
}
