-- Let volunteers opt in or out of appearing on the hotspots map (default: visible).

ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS show_on_hotspots_map BOOLEAN NOT NULL DEFAULT true;
