-- Cats that were already fixed when trapped or reported. They leave the
-- "still need fixing" count and are not counted as cats this program fixed.
ALTER TABLE cats
  ADD COLUMN IF NOT EXISTS already_fixed BOOLEAN NOT NULL DEFAULT false;
