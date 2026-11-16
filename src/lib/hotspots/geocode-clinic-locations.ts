import type { SupabaseClient } from "@supabase/supabase-js";
import { geocodeFreeformAddress } from "@/lib/geocode";
import type { MapClinic } from "@/lib/hotspots/load-hotspot-clinics";

type ClinicRow = {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  clinic_lat: number | null;
  clinic_lng: number | null;
  is_active: boolean;
};

/**
 * Geocode active clinics that still lack map coordinates, persist them, and
 * return the mapped clinics list (including newly geocoded rows).
 */
export async function backfillClinicCoordinates(
  supabase: SupabaseClient,
  limit = 12
): Promise<MapClinic[]> {
  const { data, error } = await supabase
    .from("clinics")
    .select("id, name, address, phone, website, clinic_lat, clinic_lng, is_active")
    .eq("is_active", true)
    .order("name");

  if (error || !data) return [];

  const rows = data as ClinicRow[];
  const mapped: MapClinic[] = [];
  let remaining = limit;

  for (const clinic of rows) {
    let lat = clinic.clinic_lat;
    let lng = clinic.clinic_lng;

    if (
      (lat == null || lng == null) &&
      remaining > 0 &&
      clinic.address?.trim()
    ) {
      const coords = await geocodeFreeformAddress(clinic.address);
      remaining -= 1;
      if (coords) {
        lat = coords.lat;
        lng = coords.lng;
        await supabase
          .from("clinics")
          .update({ clinic_lat: lat, clinic_lng: lng })
          .eq("id", clinic.id);
      }
    }

    if (typeof lat === "number" && typeof lng === "number") {
      mapped.push({
        id: clinic.id,
        name: clinic.name,
        address: clinic.address,
        phone: clinic.phone,
        website: clinic.website,
        clinic_lat: lat,
        clinic_lng: lng,
        is_active: clinic.is_active,
      });
    }
  }

  return mapped;
}
