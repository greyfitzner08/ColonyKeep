-- Recalculate still-at-colony counts: reported minus cats sent to foster/facility.

WITH foster_by_case AS (
  SELECT
    help_request_id,
    COUNT(*) FILTER (
      WHERE age_category = 'adult' AND went_to_foster_facility = true
    )::int AS foster_adults,
    COUNT(*) FILTER (
      WHERE age_category = 'kitten' AND went_to_foster_facility = true
    )::int AS foster_kittens
  FROM clinic_fixes
  GROUP BY help_request_id

  UNION ALL

  SELECT
    c.help_request_id,
    COUNT(*) FILTER (
      WHERE COALESCE(c.age_category, 'adult') = 'adult'
        AND c.went_to_foster_facility = true
        AND NOT EXISTS (
          SELECT 1 FROM clinic_fixes cf
          WHERE cf.cat_id = c.id AND cf.went_to_foster_facility = true
        )
    )::int AS foster_adults,
    COUNT(*) FILTER (
      WHERE c.age_category = 'kitten'
        AND c.went_to_foster_facility = true
        AND NOT EXISTS (
          SELECT 1 FROM clinic_fixes cf
          WHERE cf.cat_id = c.id AND cf.went_to_foster_facility = true
        )
    )::int AS foster_kittens
  FROM cats c
  GROUP BY c.help_request_id
),
foster_totals AS (
  SELECT
    help_request_id,
    SUM(foster_adults)::int AS foster_adults,
    SUM(foster_kittens)::int AS foster_kittens
  FROM foster_by_case
  GROUP BY help_request_id
)
UPDATE help_requests hr
SET
  cats_over_8_weeks = GREATEST(
    0,
    COALESCE(hr.reported_cats_over_8_weeks, hr.cats_over_8_weeks, 0) - ft.foster_adults
  ),
  kittens_under_8_weeks = GREATEST(
    0,
    COALESCE(hr.reported_kittens_under_8_weeks, hr.kittens_under_8_weeks, 0) - ft.foster_kittens
  ),
  cats_remaining = GREATEST(
    0,
    COALESCE(hr.reported_cats_over_8_weeks, hr.cats_over_8_weeks, 0) - ft.foster_adults
  ) + GREATEST(
    0,
    COALESCE(hr.reported_kittens_under_8_weeks, hr.kittens_under_8_weeks, 0) - ft.foster_kittens
  )
FROM foster_totals ft
WHERE hr.id = ft.help_request_id;
