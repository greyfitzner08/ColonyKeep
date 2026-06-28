-- Track whether fixed cats went to foster/facility vs returned to colony.

ALTER TABLE clinic_fixes
  ADD COLUMN IF NOT EXISTS went_to_foster_facility BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS foster_facility TEXT
    CHECK (
      foster_facility IS NULL
      OR foster_facility IN (
        'humane_society_charlotte',
        'animal_care_control',
        'pet_supermarket',
        'princetons_meow',
        'other'
      )
    ),
  ADD COLUMN IF NOT EXISTS foster_facility_other TEXT;

ALTER TABLE clinic_fixes
  DROP CONSTRAINT IF EXISTS clinic_fixes_foster_facility_when_sent;

ALTER TABLE clinic_fixes
  ADD CONSTRAINT clinic_fixes_foster_facility_when_sent CHECK (
    (went_to_foster_facility = false AND foster_facility IS NULL AND foster_facility_other IS NULL)
    OR (
      went_to_foster_facility = true
      AND foster_facility IS NOT NULL
      AND (foster_facility <> 'other' OR NULLIF(btrim(foster_facility_other), '') IS NOT NULL)
    )
  );
