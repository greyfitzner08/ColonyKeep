-- Store structured foster/facility and age on tracked cats.

ALTER TABLE cats
  ADD COLUMN IF NOT EXISTS age_category TEXT
    CHECK (age_category IS NULL OR age_category IN ('adult', 'kitten')),
  ADD COLUMN IF NOT EXISTS went_to_foster_facility BOOLEAN,
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

UPDATE cats
SET
  went_to_foster_facility = true,
  foster_facility = 'other',
  foster_facility_other = COALESCE(NULLIF(trim(foster_program), ''), 'Foster')
WHERE lower(trim(coalesce(return_status, ''))) LIKE '%foster%'
  AND went_to_foster_facility IS NULL;

UPDATE cats
SET went_to_foster_facility = false
WHERE went_to_foster_facility IS NULL
  AND (
    lower(trim(coalesce(return_status, ''))) LIKE '%return%'
    OR (
      lower(trim(coalesce(appointment_status, ''))) IN ('complete', 'completed')
      OR lower(trim(coalesce(trapped_status, ''))) IN ('fixed', 'trapped')
    )
  );
