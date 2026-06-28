-- Recalculate not-yet-fixed counts: originally reported minus clinic fixes.

UPDATE help_requests hr
SET
  cats_over_8_weeks = GREATEST(
    0,
    COALESCE(hr.reported_cats_over_8_weeks, hr.cats_over_8_weeks, 0) - COALESCE(
      (
        SELECT COUNT(*)::int
        FROM clinic_fixes cf
        WHERE cf.help_request_id = hr.id AND cf.age_category = 'adult'
      ),
      0
    )
  ),
  kittens_under_8_weeks = GREATEST(
    0,
    COALESCE(hr.reported_kittens_under_8_weeks, hr.kittens_under_8_weeks, 0) - COALESCE(
      (
        SELECT COUNT(*)::int
        FROM clinic_fixes cf
        WHERE cf.help_request_id = hr.id AND cf.age_category = 'kitten'
      ),
      0
    )
  ),
  cats_remaining = GREATEST(
    0,
    COALESCE(hr.reported_cats_over_8_weeks, hr.cats_over_8_weeks, 0) - COALESCE(
      (
        SELECT COUNT(*)::int
        FROM clinic_fixes cf
        WHERE cf.help_request_id = hr.id AND cf.age_category = 'adult'
      ),
      0
    )
  ) + GREATEST(
    0,
    COALESCE(hr.reported_kittens_under_8_weeks, hr.kittens_under_8_weeks, 0) - COALESCE(
      (
        SELECT COUNT(*)::int
        FROM clinic_fixes cf
        WHERE cf.help_request_id = hr.id AND cf.age_category = 'kitten'
      ),
      0
    )
  ),
  outcome_tnvr_count = COALESCE(
    (
      SELECT COUNT(*)::int
      FROM clinic_fixes cf
      WHERE cf.help_request_id = hr.id
    ),
    0
  );
