-- Allow volunteers to hide email in the team directory.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_email_in_directory BOOLEAN NOT NULL DEFAULT true;

COMMENT ON COLUMN profiles.show_email_in_directory IS
  'When false, email is hidden from the team directory for other volunteers.';
