-- Directory & map contact visibility is opt-in: hide until the user chooses to share.
ALTER TABLE profiles
  ALTER COLUMN show_on_hotspots_map SET DEFAULT false,
  ALTER COLUMN show_phone_in_directory SET DEFAULT false,
  ALTER COLUMN show_email_in_directory SET DEFAULT false,
  ALTER COLUMN show_address_in_directory SET DEFAULT false,
  ALTER COLUMN show_phone_on_hotspots_map SET DEFAULT false,
  ALTER COLUMN show_address_on_hotspots_map SET DEFAULT false;

UPDATE profiles
SET
  show_on_hotspots_map = false,
  show_phone_in_directory = false,
  show_email_in_directory = false,
  show_address_in_directory = false,
  show_phone_on_hotspots_map = false,
  show_address_on_hotspots_map = false;

COMMENT ON COLUMN profiles.show_on_hotspots_map IS
  'When true, the volunteer appears on the hotspots map. Default false (opt-in).';
COMMENT ON COLUMN profiles.show_phone_in_directory IS
  'When true, phone is visible in the team directory. Default false (opt-in).';
COMMENT ON COLUMN profiles.show_email_in_directory IS
  'When true, email is visible in the team directory. Default false (opt-in).';
COMMENT ON COLUMN profiles.show_address_in_directory IS
  'When true, home address is visible in the team directory. Default false (opt-in).';
COMMENT ON COLUMN profiles.show_phone_on_hotspots_map IS
  'When true, phone is shown on the hotspots map marker. Default false (opt-in).';
COMMENT ON COLUMN profiles.show_address_on_hotspots_map IS
  'When true, home address is shown on the hotspots map marker. Default false (opt-in).';
