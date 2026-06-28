import type { SupabaseClient } from "@supabase/supabase-js";
import { geocodeStreetAddress } from "@/lib/geocode";
import type { HotspotMapVolunteer } from "@/lib/hotspots/volunteer-role-filter";
import { resolveContactPrivacy } from "@/lib/volunteers/contact-privacy";
import { formatHomeAddress, isHomeAddressComplete } from "@/lib/volunteers/contact-fields";
import type { UserRole, VolunteerRole } from "@/lib/types";

const MAP_PROFILE_ROLES: UserRole[] = [
  "admin",
  "inquiry_team",
  "trap_team_lead",
  "volunteer",
];

const PROFILE_MAP_FIELDS =
  "id, full_name, email, phone, role, volunteer_roles, show_on_hotspots_map, show_phone_on_hotspots_map, show_address_on_hotspots_map, home_street, home_city, home_state, home_zip, home_county, home_lat, home_lng";

const PROFILE_MAP_FIELDS_LEGACY =
  "id, full_name, email, phone, role, volunteer_roles, show_on_hotspots_map, home_street, home_city, home_state, home_zip, home_county, home_lat, home_lng";

interface ProfileMapRow {
  id: string;
  full_name: string | null;
  email: string;
  phone: string | null;
  role: UserRole | null;
  volunteer_roles: VolunteerRole[] | null;
  show_on_hotspots_map?: boolean | null;
  show_phone_on_hotspots_map?: boolean | null;
  show_address_on_hotspots_map?: boolean | null;
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

function isVisibleOnHotspotsMap(profile: ProfileMapRow) {
  return profile.show_on_hotspots_map !== false;
}

function toHotspotMapVolunteer(
  profile: ProfileMapRow,
  coords: { lat: number; lng: number }
): HotspotMapVolunteer {
  const privacy = resolveContactPrivacy(profile);
  const volunteer: HotspotMapVolunteer = {
    id: profile.id,
    full_name: profile.full_name,
    email: profile.email,
    role: profile.role,
    volunteer_roles: profile.volunteer_roles ?? [],
    home_lat: coords.lat,
    home_lng: coords.lng,
  };

  if (privacy.show_phone_on_hotspots_map && profile.phone?.trim()) {
    volunteer.phone = profile.phone.trim();
  }

  if (privacy.show_address_on_hotspots_map) {
    const address = formatHomeAddress(profile);
    if (address) volunteer.address = address;
  }

  return volunteer;
}

export async function loadHotspotVolunteersWithCoordsOnly(
  service: SupabaseClient
): Promise<HotspotMapVolunteer[]> {
  const rows = await fetchHotspotProfileRows(service);
  const volunteers: HotspotMapVolunteer[] = [];

  for (const profile of rows) {
    if (!isVisibleOnHotspotsMap(profile) || !hasMappableAddress(profile)) continue;
    if (profile.home_lat == null || profile.home_lng == null) continue;

    volunteers.push(
      toHotspotMapVolunteer(profile, { lat: profile.home_lat, lng: profile.home_lng })
    );
  }

  return volunteers.sort((a, b) =>
    (a.full_name ?? a.email).localeCompare(b.full_name ?? b.email, undefined, {
      sensitivity: "base",
    })
  );
}

async function fetchHotspotProfileRows(service: SupabaseClient): Promise<ProfileMapRow[]> {
  const extendedResult = await service
    .from("profiles")
    .select(PROFILE_MAP_FIELDS)
    .in("role", MAP_PROFILE_ROLES)
    .or("home_street.not.is.null,home_lat.not.is.null");

  if (isMissingColumnError(extendedResult.error?.message)) {
    const legacyResult = await service
      .from("profiles")
      .select(PROFILE_MAP_FIELDS_LEGACY)
      .in("role", MAP_PROFILE_ROLES)
      .not("home_street", "is", null);

    if (legacyResult.error) return [];
    return (legacyResult.data ?? []) as ProfileMapRow[];
  }

  if (extendedResult.error) return [];
  return (extendedResult.data ?? []) as ProfileMapRow[];
}

export async function loadHotspotVolunteers(
  service: SupabaseClient,
  options?: { geocodeLimit?: number }
): Promise<HotspotMapVolunteer[]> {
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

  if (geocodeLimit <= 0) {
    return loadHotspotVolunteersWithCoordsOnly(service);
  }

  const volunteers: HotspotMapVolunteer[] = [];
  let geocoded = 0;

  for (const profile of rows) {
    if (!isVisibleOnHotspotsMap(profile) || !hasMappableAddress(profile)) continue;

    if (profile.home_lat != null && profile.home_lng != null) {
      volunteers.push(
        toHotspotMapVolunteer(profile, { lat: profile.home_lat, lng: profile.home_lng })
      );
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

    volunteers.push(toHotspotMapVolunteer(profile, coords));

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
