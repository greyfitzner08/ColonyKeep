-- Colony feeder contact fields, multi-team feed posts, volunteer map coordinates.

ALTER TABLE help_requests
  ADD COLUMN IF NOT EXISTS feeder_name TEXT,
  ADD COLUMN IF NOT EXISTS feeder_phone TEXT,
  ADD COLUMN IF NOT EXISTS feeder_email TEXT,
  ADD COLUMN IF NOT EXISTS feeder_street TEXT,
  ADD COLUMN IF NOT EXISTS feeder_city TEXT,
  ADD COLUMN IF NOT EXISTS feeder_state TEXT,
  ADD COLUMN IF NOT EXISTS feeder_zip TEXT,
  ADD COLUMN IF NOT EXISTS feeder_county TEXT,
  ADD COLUMN IF NOT EXISTS feeder_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS feeder_lng DOUBLE PRECISION;

ALTER TABLE team_announcements
  ADD COLUMN IF NOT EXISTS team_ids UUID[] NOT NULL DEFAULT '{}';

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS home_lat DOUBLE PRECISION,
  ADD COLUMN IF NOT EXISTS home_lng DOUBLE PRECISION;
