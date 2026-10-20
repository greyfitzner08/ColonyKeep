ALTER TABLE clinics
  ADD COLUMN IF NOT EXISTS emails TEXT[] NOT NULL DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS website TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN clinics.emails IS
  'One or more clinic contact emails shown on the clinic record.';
COMMENT ON COLUMN clinics.website IS
  'Clinic website URL.';
