import type { SupabaseClient } from "@supabase/supabase-js";

export interface MapClinic {
  id: string;
  name: string;
  address: string;
  phone: string | null;
  website: string | null;
  clinic_lat: number;
  clinic_lng: number;
  is_active: boolean;
}

function isMissingColumnError(message: string | undefined) {
  return Boolean(message?.includes("column") && message.includes("does not exist"));
}

export async function loadHotspotClinics(
  supabase: SupabaseClient
): Promise<{ clinics: MapClinic[]; error: string | null }> {
  const result = await supabase
    .from("clinics")
    .select("id, name, address, phone, website, clinic_lat, clinic_lng, is_active")
    .eq("is_active", true)
    .not("clinic_lat", "is", null)
    .not("clinic_lng", "is", null)
    .order("name");

  if (isMissingColumnError(result.error?.message)) {
    return { clinics: [], error: null };
  }

  if (result.error) {
    return { clinics: [], error: result.error.message };
  }

  const clinics = ((result.data ?? []) as Array<{
    id: string;
    name: string;
    address: string;
    phone: string | null;
    website: string | null;
    clinic_lat: number | null;
    clinic_lng: number | null;
    is_active: boolean;
  }>)
    .filter(
      (clinic): clinic is typeof clinic & { clinic_lat: number; clinic_lng: number } =>
        typeof clinic.clinic_lat === "number" && typeof clinic.clinic_lng === "number"
    )
    .map(
      (clinic): MapClinic => ({
        id: clinic.id,
        name: clinic.name,
        address: clinic.address,
        phone: clinic.phone,
        website: clinic.website,
        clinic_lat: clinic.clinic_lat,
        clinic_lng: clinic.clinic_lng,
        is_active: clinic.is_active,
      })
    );

  return { clinics, error: null };
}
