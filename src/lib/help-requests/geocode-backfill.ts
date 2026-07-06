import { geocodeAddress } from "@/lib/geocode";
import { HOTSPOT_COLONY_STATUSES } from "@/lib/cases/statuses";
import type { HelpRequest } from "@/lib/types";
import type { SupabaseClient } from "@supabase/supabase-js";

const GEOCODE_BACKFILL_FIELDS =
  "id, case_number, status, colony_address, colony_city, colony_state, colony_zip, colony_county, colony_lat, colony_lng";

export function hasGeocodableColonyAddress(hr: {
  colony_address?: string | null;
  colony_city?: string | null;
  colony_zip?: string | null;
}) {
  return Boolean(
    hr.colony_address?.trim() || hr.colony_city?.trim() || hr.colony_zip?.trim()
  );
}

function isMissingColonyCoords(hr: Pick<HelpRequest, "colony_lat" | "colony_lng">) {
  return hr.colony_lat == null || hr.colony_lng == null;
}

async function rateLimitGeocode() {
  if (!process.env.GOOGLE_MAPS_API_KEY) {
    await new Promise((resolve) => setTimeout(resolve, 1100));
  }
}

export async function geocodeColonyFields(hr: {
  colony_address?: string | null;
  colony_city?: string | null;
  colony_state?: string | null;
  colony_zip?: string | null;
  colony_county?: string | null;
}) {
  if (!hasGeocodableColonyAddress(hr)) return null;

  return geocodeAddress({
    colony_address: hr.colony_address,
    colony_city: hr.colony_city,
    colony_state: hr.colony_state,
    colony_zip: hr.colony_zip,
    colony_county: hr.colony_county,
  });
}

export interface GeocodeBackfillStats {
  geocoded: number;
  failed: number;
  skippedNoAddress: number;
  remaining: number;
  lastProcessedId: string | null;
  exhausted: boolean;
  updated: Array<{ id: string; colony_lat: number; colony_lng: number }>;
}

export async function countUnmappedHotspotColonies(
  service: SupabaseClient
): Promise<{ unmapped: number; unmappedWithAddress: number }> {
  const { data, count, error } = await service
    .from("help_requests")
    .select("id, colony_address, colony_city, colony_zip", { count: "exact" })
    .in("status", HOTSPOT_COLONY_STATUSES)
    .or("colony_lat.is.null,colony_lng.is.null");

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  return {
    unmapped: count ?? rows.length,
    unmappedWithAddress: rows.filter(hasGeocodableColonyAddress).length,
  };
}

export async function backfillUnmappedHotspotColonies(
  service: SupabaseClient,
  options?: { limit?: number; startAfterId?: string | null }
): Promise<GeocodeBackfillStats> {
  const limit = Math.min(Math.max(options?.limit ?? 20, 1), 30);
  let query = service
    .from("help_requests")
    .select(GEOCODE_BACKFILL_FIELDS)
    .in("status", HOTSPOT_COLONY_STATUSES)
    .or("colony_lat.is.null,colony_lng.is.null")
    .order("id", { ascending: true })
    .limit(limit * 4);

  if (options?.startAfterId) {
    query = query.gt("id", options.startAfterId);
  }

  const result = await query;

  if (result.error) {
    throw new Error(result.error.message);
  }

  const rows = (result.data ?? []) as HelpRequest[];

  let geocoded = 0;
  let failed = 0;
  let skippedNoAddress = 0;
  let lastProcessedId: string | null = options?.startAfterId ?? null;
  const updated: GeocodeBackfillStats["updated"] = [];

  for (const row of rows) {
    if (geocoded + failed >= limit) break;
    if (!isMissingColonyCoords(row)) continue;

    lastProcessedId = row.id;

    if (!hasGeocodableColonyAddress(row)) {
      skippedNoAddress += 1;
      continue;
    }

    const coords = await geocodeColonyFields(row);
    await rateLimitGeocode();

    if (!coords) {
      failed += 1;
      continue;
    }

    const { error } = await service
      .from("help_requests")
      .update({ colony_lat: coords.lat, colony_lng: coords.lng })
      .eq("id", row.id);

    if (error) {
      failed += 1;
      continue;
    }

    geocoded += 1;
    updated.push({ id: row.id, colony_lat: coords.lat, colony_lng: coords.lng });
  }

  const { unmapped: remaining } = await countUnmappedHotspotColonies(service);

  return {
    geocoded,
    failed,
    skippedNoAddress,
    remaining,
    lastProcessedId,
    exhausted: rows.length === 0,
    updated,
  };
}

export async function backfillHelpRequestCoordinates(
  service: SupabaseClient,
  helpRequests: HelpRequest[],
  limit = 25
): Promise<HelpRequest[]> {
  const updated = [...helpRequests];
  let processed = 0;

  for (let index = 0; index < updated.length; index += 1) {
    const hr = updated[index];
    if (!isMissingColonyCoords(hr)) continue;
    if (!hasGeocodableColonyAddress(hr)) continue;
    if (processed >= limit) break;

    const coords = await geocodeColonyFields(hr);
    processed += 1;

    if (!coords) continue;

    const { error } = await service
      .from("help_requests")
      .update({ colony_lat: coords.lat, colony_lng: coords.lng })
      .eq("id", hr.id);

    if (!error) {
      updated[index] = { ...hr, colony_lat: coords.lat, colony_lng: coords.lng };
    }

    await rateLimitGeocode();
  }

  return updated;
}
