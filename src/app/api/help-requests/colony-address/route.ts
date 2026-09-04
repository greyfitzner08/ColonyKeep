import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { requireCaseWorker } from "@/lib/api/auth";
import { applyTrapTeamAssignment } from "@/lib/cases/assign-team-by-zip";
import { caseClaimBlockForId } from "@/lib/cases/case-claim-block";
import { colonyAddressPayload } from "@/lib/cases/colony-address-fields";
import {
  geocodeColonyFields,
  hasGeocodableColonyAddress,
} from "@/lib/help-requests/geocode-backfill";
import { COLONY_HOTSPOT_FIELDS } from "@/lib/hotspots/load-hotspots-data";
import { createServiceClient } from "@/lib/supabase/server";
import { hasSupabaseAdminConfig } from "@/lib/supabase/env";
import type { HelpRequest } from "@/lib/types";

function readString(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function readOptionalNumber(value: unknown) {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

export async function PATCH(request: NextRequest) {
  const { profile, response } = await requireCaseWorker();
  if (response) return response;

  if (!hasSupabaseAdminConfig()) {
    return NextResponse.json({ error: "Server admin configuration required." }, { status: 503 });
  }

  const body = await request.json().catch(() => null);
  const helpRequestId = readString(body?.help_request_id);

  if (!helpRequestId) {
    return NextResponse.json({ error: "help_request_id is required" }, { status: 400 });
  }

  const colonyFields = {
    colony_address: readString(body?.colony_address),
    colony_city: readString(body?.colony_city),
    colony_state: readString(body?.colony_state),
    colony_zip: readString(body?.colony_zip),
    colony_county: readString(body?.colony_county),
  };

  if (!hasGeocodableColonyAddress(colonyFields)) {
    return NextResponse.json(
      { error: "Enter a street, city, or ZIP code for the colony location." },
      { status: 400 }
    );
  }

  const service = await createServiceClient();
  const claimBlock = await caseClaimBlockForId({
    service,
    helpRequestId,
    profile: profile!,
  });
  if (claimBlock) return claimBlock;

  let colony_lat = readOptionalNumber(body?.colony_lat);
  let colony_lng = readOptionalNumber(body?.colony_lng);

  if (colony_lat == null || colony_lng == null) {
    const coords = await geocodeColonyFields(colonyFields);
    if (coords) {
      colony_lat = coords.lat;
      colony_lng = coords.lng;
    }
  }

  const { data: teams } = await service
    .from("trap_teams")
    .select("id, name, zip_codes, is_active")
    .eq("is_active", true);

  const withTeam = applyTrapTeamAssignment(
    {
      ...colonyFields,
      colony_lat,
      colony_lng,
      assigned_team_id: null,
      assigned_team_name: null,
    },
    colonyFields.colony_zip,
    teams ?? []
  );

  const { data: updated, error: updateError } = await service
    .from("help_requests")
    .update(colonyAddressPayload(withTeam))
    .eq("id", helpRequestId)
    .select(COLONY_HOTSPOT_FIELDS)
    .single();

  if (updateError) {
    return NextResponse.json({ error: updateError.message }, { status: 500 });
  }

  revalidateTag("hotspots");

  return NextResponse.json({
    helpRequest: updated as HelpRequest,
    geocoded: colony_lat != null && colony_lng != null,
  });
}
