-- Cats taken to a facility before they are fixed. They leave the
-- "still need fixing" count and are not clinic fixes.
ALTER TABLE cats
  ADD COLUMN IF NOT EXISTS transferred_unfixed BOOLEAN NOT NULL DEFAULT false;
