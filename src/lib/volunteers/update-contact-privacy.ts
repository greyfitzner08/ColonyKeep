import type { SupabaseClient } from "@supabase/supabase-js";
import type { ContactPrivacySettings } from "@/lib/volunteers/contact-privacy";

export type ContactPrivacyUpdate = Partial<ContactPrivacySettings>;

export async function updateProfileContactPrivacy(
  service: SupabaseClient,
  profileId: string,
  updates: ContactPrivacyUpdate
) {
  const payload: Record<string, boolean> = {};

  if (updates.show_on_hotspots_map !== undefined) {
    payload.show_on_hotspots_map = updates.show_on_hotspots_map;
  }
  if (updates.show_phone_in_directory !== undefined) {
    payload.show_phone_in_directory = updates.show_phone_in_directory;
  }
  if (updates.show_email_in_directory !== undefined) {
    payload.show_email_in_directory = updates.show_email_in_directory;
  }
  if (updates.show_address_in_directory !== undefined) {
    payload.show_address_in_directory = updates.show_address_in_directory;
  }
  if (updates.show_phone_on_hotspots_map !== undefined) {
    payload.show_phone_on_hotspots_map = updates.show_phone_on_hotspots_map;
  }
  if (updates.show_address_on_hotspots_map !== undefined) {
    payload.show_address_on_hotspots_map = updates.show_address_on_hotspots_map;
  }

  return service.from("profiles").update(payload).eq("id", profileId);
}
