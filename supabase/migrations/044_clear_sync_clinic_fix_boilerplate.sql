-- Remove internal boilerplate from auto-synced clinic fix rows.

UPDATE clinic_fixes
SET
  notes = NULL,
  logged_by_name = NULL
WHERE logged_by = 'tracked-cat-sync'
  AND notes = 'Synced from tracked cat status';
