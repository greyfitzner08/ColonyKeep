import type { Profile } from "@/lib/types";

export interface ContactPrivacySettings {
  show_on_hotspots_map: boolean;
  show_phone_in_directory: boolean;
  show_email_in_directory: boolean;
  show_address_in_directory: boolean;
  show_phone_on_hotspots_map: boolean;
  show_address_on_hotspots_map: boolean;
}

type PrivacyFlag = boolean | null | undefined;

/** All directory/map contact fields are opt-in — hide unless explicitly true. */
export function resolveContactPrivacy(profile: {
  show_on_hotspots_map?: PrivacyFlag;
  show_phone_in_directory?: PrivacyFlag;
  show_email_in_directory?: PrivacyFlag;
  show_address_in_directory?: PrivacyFlag;
  show_phone_on_hotspots_map?: PrivacyFlag;
  show_address_on_hotspots_map?: PrivacyFlag;
}): ContactPrivacySettings {
  return {
    show_on_hotspots_map: profile.show_on_hotspots_map === true,
    show_phone_in_directory: profile.show_phone_in_directory === true,
    show_email_in_directory: profile.show_email_in_directory === true,
    show_address_in_directory: profile.show_address_in_directory === true,
    show_phone_on_hotspots_map: profile.show_phone_on_hotspots_map === true,
    show_address_on_hotspots_map: profile.show_address_on_hotspots_map === true,
  };
}

export function contactPrivacyFromProfile(profile: Profile): ContactPrivacySettings {
  return resolveContactPrivacy(profile);
}
