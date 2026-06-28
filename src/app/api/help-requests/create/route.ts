import { NextRequest, NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createServiceClient } from "@/lib/supabase/server";
import {
  getSupabasePublishableKey,
  getSupabaseUrl,
  hasSupabaseAdminConfig,
  hasSupabaseServerConfig,
} from "@/lib/supabase/env";
import { applyTrapTeamAssignment } from "@/lib/cases/assign-team-by-zip";
import { mapCommunityIntakeToHelpRequest } from "@/lib/cases/public-intake";
import { sanitizeHelpRequestRecord } from "@/lib/cases/help-request-insert";
import { geocodeAddress, geocodeStreetAddress } from "@/lib/geocode";

async function getWriteClient(): Promise<SupabaseClient | null> {
  if (hasSupabaseAdminConfig()) {
    return createServiceClient();
  }

  if (!hasSupabaseServerConfig()) {
    return null;
  }

  const { createClient } = await import("@supabase/supabase-js");
  return createClient(getSupabaseUrl()!, getSupabasePublishableKey()!);
}

export async function POST(request: NextRequest) {
  if (!hasSupabaseAdminConfig() && !hasSupabaseServerConfig()) {
    return NextResponse.json(
      {
        error:
          "Request submissions are temporarily unavailable. The server is missing database configuration.",
      },
      { status: 503 }
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 });
  }

  const contactName = [body.contact_first_name, body.contact_last_name]
    .filter(Boolean)
    .join(" ")
    .trim();

  const actorName =
    contactName ||
    (typeof body.contact_name === "string" ? body.contact_name.trim() : "") ||
    (typeof body.contact_email === "string" ? body.contact_email : "") ||
    "Community member";

  const mapped = mapCommunityIntakeToHelpRequest(body, actorName);

  if (mapped.error || !mapped.record) {
    return NextResponse.json({ error: mapped.error ?? "Invalid submission" }, { status: 400 });
  }

  try {
    const client = await getWriteClient();
    if (!client) {
      return NextResponse.json(
        { error: "Request submissions are temporarily unavailable." },
        { status: 503 }
      );
    }

    const { data: teams } = await client
      .from("trap_teams")
      .select("id, name, zip_codes, is_active")
      .eq("is_active", true);

    const assigned = applyTrapTeamAssignment(
      mapped.record,
      String(mapped.record.colony_zip ?? ""),
      teams ?? []
    );

    const record = sanitizeHelpRequestRecord(assigned);

    if (!record.colony_lat || !record.colony_lng) {
      try {
        const coords = await geocodeAddress({
          colony_address: String(record.colony_address ?? ""),
          colony_city: String(record.colony_city ?? ""),
          colony_state: String(record.colony_state ?? ""),
          colony_zip: String(record.colony_zip ?? ""),
          colony_county: String(record.colony_county ?? ""),
        });
        if (coords) {
          record.colony_lat = coords.lat;
          record.colony_lng = coords.lng;
        }
      } catch (geocodeError) {
        console.warn("help-requests/create geocode skipped:", geocodeError);
      }
    }

    if (record.feeder_street && !record.feeder_lat) {
      try {
        const coords = await geocodeStreetAddress({
          street: String(record.feeder_street ?? ""),
          city: String(record.feeder_city ?? ""),
          state: String(record.feeder_state ?? ""),
          zip: String(record.feeder_zip ?? ""),
          county: String(record.feeder_county ?? ""),
        });
        if (coords) {
          record.feeder_lat = coords.lat;
          record.feeder_lng = coords.lng;
        }
      } catch (geocodeError) {
        console.warn("help-requests/create feeder geocode skipped:", geocodeError);
      }
    }

    const { data, error } = await client.rpc("create_community_help_request", {
      payload: record,
    });

    if (error) {
      console.error("help-requests/create rpc failed:", error.message);
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    const row = Array.isArray(data) ? data[0] : data;
    const caseNumber =
      row && typeof row === "object" && "case_number" in row
        ? String((row as { case_number: string }).case_number)
        : "";

    if (!caseNumber) {
      return NextResponse.json(
        { error: "Case was created but no case number was returned." },
        { status: 500 }
      );
    }

    return NextResponse.json({ caseNumber });
  } catch (error) {
    console.error("help-requests/create unexpected error:", error);
    return NextResponse.json(
      { error: "Unable to submit request. Please try again." },
      { status: 500 }
    );
  }
}
