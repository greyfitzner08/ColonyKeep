import type { SupabaseClient } from "@supabase/supabase-js";
import type { MapVolunteer } from "@/components/maps/hotspots-map";
import { geocodeStreetAddress } from "@/lib/geocode";
import { isHomeAddressComplete } from "@/lib/volunteers/contact-fields";
import type { UserRole } from "@/lib/types";

const MAP_PROFILE_ROLES: UserRole[] = [
  "admin",
  "inquiry_team",
  "trap_team_lead",
  "clinic_coordination",
  "volunteer",
];

const PROFILE_MAP_FIELDS =
  "id, full_name, email, role, home_street, home_city, home_state, home_zip, home_county, home_lat, home_lng";

const PROFILE_MAP_FIELDS_LEGACY = "id, full_name, email, role, home_street, home_city, home_state, home_zip, home_county";

interface ProfileMapRow {
  id: string;
  full_name: string | null;
  email: string;
  role: UserRole | null;
  home_street: string | null;
  home_city: string | null;
  home_state: string | null;
  home_zip: string | null;
  home_county: string | null;
  home_lat?: number | null;
  home_lng?: number | null;
}

function isMissingColumnError(message: string | undefined) {
  return Boolean(message?.includes("column") && message.includes("does not exist"));
}

function hasMappableAddress(profile: ProfileMapRow) {
  return Boolean(profile.home_street?.trim() || profile.home_city?.trim() || profile.home_zip?.trim());
}

export async function loadHotspotVolunteers(
  service: SupabaseClient,
  options?: { geocodeLimit?: number }
): Promise<MapVolunteer[]> {
  const geocodeLimit = options?.geocodeLimit ?? 25;
  let rows: ProfileMapRow[] = [];
  let canPersistCoords = true;

  const extendedResult = await service
    .from("profiles")
    .select(PROFILE_MAP_FIELDS)
    .in("role", MAP_PROFILE_ROLES)
    .or("home_street.not.is.null,home_lat.not.is.null");

  if (isMissingColumnError(extendedResult.error?.message)) {
    canPersistCoords = false;
    const legacyResult = await service
      .from("profiles")
      .select(PROFILE_MAP_FIELDS_LEGACY)
      .in("role", MAP_PROFILE_ROLES)
      .not("home_street", "is", null);

    if (legacyResult.error) return [];
    rows = (legacyResult.data ?? []) as ProfileMapRow[];
  } else {
    if (extendedResult.error) return [];
    rows = (extendedResult.data ?? []) as ProfileMapRow[];
  }

  const volunteers: MapVolunteer[] = [];
  let geocoded = 0;

  for (const profile of rows) {
    if (!hasMappableAddress(profile)) continue;

    if (profile.home_lat != null && profile.home_lng != null) {
      volunteers.push({
        id: profile.id,
        full_name: profile.full_name,
        email: profile.email,
        role: profile.role,
        home_lat: profile.home_lat,
        home_lng: profile.home_lng,
      });
      continue;
    }

    if (!isHomeAddressComplete(profile) || geocoded >= geocodeLimit) continue;

    const coords = await geocodeStreetAddress({
      street: profile.home_street,
      city: profile.home_city,
      state: profile.home_state,
      zip: profile.home_zip,
      county: profile.home_county,
    });

    geocoded += 1;

    if (!coords) continue;

    if (canPersistCoords) {
      await service
        .from("profiles")
        .update({ home_lat: coords.lat, home_lng: coords.lng })
        .eq("id", profile.id);
    }

    volunteers.push({
      id: profile.id,
      full_name: profile.full_name,
      email: profile.email,
      role: profile.role,
      home_lat: coords.lat,
      home_lng: coords.lng,
    });

    if (!process.env.GOOGLE_MAPS_API_KEY) {
      await new Promise((resolve) => setTimeout(resolve, 1100));
    }
  }

  return volunteers.sort((a, b) =>
    (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email, undefined, {
      sensitivity: "base",
    })
  );
}
