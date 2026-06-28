-- Link clinic fixes to tracked cats and backfill fixes from tracked cat statuses.

ALTER TABLE clinic_fixes
  ADD COLUMN IF NOT EXISTS cat_id UUID REFERENCES cats(id) ON DELETE SET NULL;

CREATE UNIQUE INDEX IF NOT EXISTS idx_clinic_fixes_cat_id
  ON clinic_fixes(cat_id)
  WHERE cat_id IS NOT NULL;

UPDATE clinic_fixes cf
SET cat_id = a.cat_id
FROM appointments a
WHERE cf.appointment_id = a.id
  AND cf.cat_id IS NULL
  AND a.cat_id IS NOT NULL;

INSERT INTO clinic_fixes (
  help_request_id,
  cat_id,
  appointment_id,
  age_category,
  gender,
  clinic_name,
  fix_date,
  went_to_foster_facility,
  foster_facility,
  foster_facility_other,
  logged_by,
  logged_by_name,
  notes
)
SELECT
  c.help_request_id,
  c.id,
  c.appointment_id,
  'adult',
  CASE
    WHEN lower(trim(coalesce(c.gender, ''))) LIKE 'f%'
      OR lower(trim(coalesce(c.gender, ''))) = 'female'
    THEN 'female'
    ELSE 'male'
  END,
  c.clinic_name,
  COALESCE(c.return_date, c.trap_date, CURRENT_DATE),
  lower(trim(coalesce(c.return_status, ''))) LIKE '%foster%',
  CASE
    WHEN lower(trim(coalesce(c.return_status, ''))) LIKE '%foster%' THEN 'other'
    ELSE NULL
  END,
  CASE
    WHEN lower(trim(coalesce(c.return_status, ''))) LIKE '%foster%'
    THEN coalesce(nullif(trim(c.foster_program), ''), 'Foster')
    ELSE NULL
  END,
  'tracked-cat-sync',
  'Tracked cat',
  'Synced from tracked cat status'
FROM cats c
WHERE (
  lower(trim(coalesce(c.appointment_status, ''))) IN ('complete', 'completed')
  OR lower(trim(coalesce(c.trapped_status, ''))) IN ('fixed', 'trapped')
)
AND NOT EXISTS (
  SELECT 1
  FROM clinic_fixes cf
  WHERE cf.cat_id = c.id
     OR (
       cf.appointment_id IS NOT NULL
       AND c.appointment_id IS NOT NULL
       AND cf.appointment_id = c.appointment_id
     )
);

UPDATE help_requests hr
SET
  cats_over_8_weeks = GREATEST(
    0,
    COALESCE(hr.reported_cats_over_8_weeks, hr.cats_over_8_weeks, 0) - COALESCE(fc.fixed_adults, 0)
  ),
  kittens_under_8_weeks = GREATEST(
    0,
    COALESCE(hr.reported_kittens_under_8_weeks, hr.kittens_under_8_weeks, 0) - COALESCE(fc.fixed_kittens, 0)
  ),
  outcome_tnvr_count = COALESCE(fc.fixed_total, 0),
  cats_remaining = GREATEST(
    0,
    COALESCE(hr.reported_cats_over_8_weeks, hr.cats_over_8_weeks, 0) - COALESCE(fc.fixed_adults, 0)
  ) + GREATEST(
    0,
    COALESCE(hr.reported_kittens_under_8_weeks, hr.kittens_under_8_weeks, 0) - COALESCE(fc.fixed_kittens, 0)
  )
FROM (
  SELECT
    help_request_id,
    COUNT(*) FILTER (WHERE age_category = 'adult')::int AS fixed_adults,
    COUNT(*) FILTER (WHERE age_category = 'kitten')::int AS fixed_kittens,
    COUNT(*)::int AS fixed_total
  FROM clinic_fixes
  GROUP BY help_request_id
) fc
WHERE hr.id = fc.help_request_id;
