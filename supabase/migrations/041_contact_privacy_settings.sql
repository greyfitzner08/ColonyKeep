-- Per-user control over phone/address visibility in the team directory and hotspots map.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_phone_in_directory BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_address_in_directory BOOLEAN NOT NULL DEFAULT true,
  ADD COLUMN IF NOT EXISTS show_phone_on_hotspots_map BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS show_address_on_hotspots_map BOOLEAN NOT NULL DEFAULT false;
