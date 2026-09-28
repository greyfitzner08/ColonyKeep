-- Placement now lives on the rescue application (foster contact and pet-store dates).

ALTER TABLE adoptable_cats
  DROP COLUMN IF EXISTS location_id;

DROP TABLE IF EXISTS adoption_locations;
