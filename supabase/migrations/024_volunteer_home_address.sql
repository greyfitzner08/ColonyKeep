-- Volunteer home address on profile and application records.

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS home_street TEXT,
  ADD COLUMN IF NOT EXISTS home_city TEXT,
  ADD COLUMN IF NOT EXISTS home_state TEXT,
  ADD COLUMN IF NOT EXISTS home_zip TEXT,
  ADD COLUMN IF NOT EXISTS home_county TEXT;

ALTER TABLE volunteer_applications
  ADD COLUMN IF NOT EXISTS home_street TEXT,
  ADD COLUMN IF NOT EXISTS home_city TEXT,
  ADD COLUMN IF NOT EXISTS home_state TEXT,
  ADD COLUMN IF NOT EXISTS home_zip TEXT,
  ADD COLUMN IF NOT EXISTS home_county TEXT;
