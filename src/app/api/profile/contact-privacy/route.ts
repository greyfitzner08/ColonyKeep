import { NextRequest, NextResponse } from "next/server";
import { requireApiRole } from "@/lib/api/auth";
import { createServiceClient } from "@/lib/supabase/server";
import type { ContactPrivacyUpdate } from "@/lib/volunteers/update-contact-privacy";
import { updateProfileContactPrivacy } from "@/lib/volunteers/update-contact-privacy";

function readBoolean(body: Record<string, unknown>, ...keys: string[]): boolean | undefined {
  for (const key of keys) {
    const value = body[key];
    if (typeof value === "boolean") return value;
  }
  return undefined;
}

export async function POST(request: NextRequest) {
  const { profile, response } = await requireApiRole([
    "admin",
    "volunteer",
    "inquiry_team",
    "trap_team_lead",
  ]);
  if (response) return response;

  const body = (await request.json()) as Record<string, unknown>;
  const updates: ContactPrivacyUpdate = {};

  const showOnHotspotsMap = readBoolean(body, "showOnHotspotsMap", "show_on_hotspots_map");
  if (showOnHotspotsMap !== undefined) updates.show_on_hotspots_map = showOnHotspotsMap;

  const showPhoneInDirectory = readBoolean(body, "showPhoneInDirectory", "show_phone_in_directory");
  if (showPhoneInDirectory !== undefined) {
    updates.show_phone_in_directory = showPhoneInDirectory;
  }

  const showEmailInDirectory = readBoolean(body, "showEmailInDirectory", "show_email_in_directory");
  if (showEmailInDirectory !== undefined) {
    updates.show_email_in_directory = showEmailInDirectory;
  }

  const showAddressInDirectory = readBoolean(
    body,
    "showAddressInDirectory",
    "show_address_in_directory"
  );
  if (showAddressInDirectory !== undefined) {
    updates.show_address_in_directory = showAddressInDirectory;
  }

  const showPhoneOnHotspotsMap = readBoolean(
    body,
    "showPhoneOnHotspotsMap",
    "show_phone_on_hotspots_map"
  );
  if (showPhoneOnHotspotsMap !== undefined) {
    updates.show_phone_on_hotspots_map = showPhoneOnHotspotsMap;
  }

  const showAddressOnHotspotsMap = readBoolean(
    body,
    "showAddressOnHotspotsMap",
    "show_address_on_hotspots_map"
  );
  if (showAddressOnHotspotsMap !== undefined) {
    updates.show_address_on_hotspots_map = showAddressOnHotspotsMap;
  }

  if (Object.keys(updates).length === 0) {
    return NextResponse.json({ error: "No privacy settings provided" }, { status: 400 });
  }

  const service = await createServiceClient();
  const { error } = await updateProfileContactPrivacy(service, profile!.id, updates);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true, ...updates });
}
